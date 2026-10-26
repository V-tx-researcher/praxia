// Reaplica a verificação atual às saídas brutas de uma rodada da LLM e gera um
// relatório para revisão humana (cada afirmação aceita ao lado das evidências).
//
// Uso: node tests/avaliacao/reverificar-llm.mjs docs/avaliacao/llm-<modelo>-bruto.json
// Saídas: <mesmo nome>-verificado.json e <mesmo nome>-revisao.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { IndiceLexical } from "../../app/js/nucleo/busca.js";
import { classificar } from "../../app/js/nucleo/classificacao.js";
import { selecionarEvidencias, conferirEvidencias } from "../../app/js/nucleo/evidencias.js";
import { detectarDadosPessoais, mascarar } from "../../app/js/nucleo/privacidade.js";
import { verificarAnalise } from "../../app/js/nucleo/verificacao.js";
import { interpretarSaida } from "../../app/js/llm/prompt.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entrada = process.argv[2];
const rodada = JSON.parse(fs.readFileSync(entrada, "utf8"));
const acervo = JSON.parse(fs.readFileSync(path.join(RAIZ, "app/dados/acervo-previa.json"), "utf8"));
// As evidências precisam ser exatamente as que o modelo recebeu na rodada. Rodadas
// novas gravam as evidências (campo `evidenciasEnviadas`); para a rodada de 26/10/2026,
// anterior ao rebaixamento de documentos com indicação de revogação, a seleção é
// reproduzida com a busca sem esse rebaixamento e o resultado é conferido pelos rótulos.
const semIndicacoes = { ...acervo, documentos: acervo.documentos.map((d) => ({ ...d, indicacoes_portal: [] })) };
const indiceDaRodada = new IndiceLexical(rodada.reproduzirSemIndicacoes === false ? acervo : semIndicacoes);
const indice = new IndiceLexical(acervo);

const itens = [];
for (const r of rodada.resultados) {
  const dados = detectarDadosPessoais(r.pergunta);
  const pergunta = dados.length ? mascarar(r.pergunta, dados) : r.pergunta;
  const cls = classificar(pergunta);
  let evidencias;
  if (r.evidenciasEnviadas) {
    evidencias = r.evidenciasEnviadas;
  } else {
    const sel = selecionarEvidencias(indiceDaRodada, indiceDaRodada.buscar(pergunta, { limite: 40 }), { dataFatos: cls.dataFatos });
    // Recalcula a vigência com os dados atuais (inclui indicações do portal), mantendo a ordem.
    evidencias = conferirEvidencias(indice, sel.map((e, n) => ({ ...e, ...{ vigencia: selecionarEvidencias(indice, { resultados: [{ unidade: indice.porId.get(e.unidadeId), pontuacao: 1, casados: e.termosCasados, cobertura: 1, informativosCasados: 2 }] }, { dataFatos: cls.dataFatos })[0].vigencia }, id: `E${n + 1}` })));
    const rotulos = evidencias.map((e) => `${e.id} ${e.parte} | ${e.rotulo}`);
    const gravados = r.evidencias || [];
    if (gravados.length && JSON.stringify([...gravados].sort()) !== JSON.stringify([...rotulos].sort())) {
      throw new Error(`${r.id}: evidências reproduzidas diferem das da rodada`);
    }
  }
  let analise = null;
  let erro = null;
  try {
    analise = verificarAnalise(interpretarSaida(r.saidaBruta), evidencias);
  } catch (e) {
    erro = String(e.message || e);
  }
  itens.push({ id: r.id, comportamento: r.comportamento, pergunta: r.pergunta, segundos: r.segundos,
    evidencias: evidencias.map((e) => ({ id: e.id, rotulo: `${e.parte} | ${e.rotulo}`, texto: e.texto })),
    aceitas: analise?.afirmacoes ?? [], removidas: analise?.removidas ?? [], sintese: analise?.sintese ?? "",
    atencao: analise?.aspectosAtencao ?? [], erro });
}

const totalAceitas = itens.reduce((s, i) => s + i.aceitas.length, 0);
const totalRemovidas = itens.reduce((s, i) => s + i.removidas.length, 0);
const motivos = {};
for (const i of itens) for (const r of i.removidas) for (const m of r.motivos) {
  const chave = m.replace(/«.*»/, "«…»").replace(/\(\d+%\)/, "(…%)");
  motivos[chave] = (motivos[chave] || 0) + 1;
}
const resumo = {
  modelo: rodada.modelo, perguntas: itens.length,
  com_analise_aceita: itens.filter((i) => i.aceitas.length).length,
  sem_analise_aceita: itens.filter((i) => !i.aceitas.length).map((i) => i.id),
  afirmacoes_aceitas: totalAceitas, afirmacoes_removidas: totalRemovidas,
  taxa_remocao: +(totalRemovidas / Math.max(1, totalAceitas + totalRemovidas)).toFixed(3),
  motivos_remocao: motivos,
  falhas_de_formato: itens.filter((i) => i.erro).map((i) => i.id),
  tempo_medio_s: +(itens.reduce((s, i) => s + (i.segundos || 0), 0) / itens.length).toFixed(1),
};

const base = entrada.replace(/-bruto\.json$/, "");
fs.writeFileSync(`${base}-verificado.json`, JSON.stringify({ resumo, itens }, null, 2));

const md = [`# Revisão humana — ${rodada.modelo}`, "",
  "Para cada pergunta: afirmações que **passaram** na verificação automática, com as evidências citadas.",
  "Marque em cada afirmação: [C] correta e fundamentada · [P] parcialmente · [I] incorreta ou enganosa.", "",
  "```", JSON.stringify(resumo, null, 2), "```", ""];
for (const i of itens) {
  md.push(`## ${i.id} — ${i.pergunta}`, "");
  if (i.erro) md.push(`Falha de formato: ${i.erro}`, "");
  if (i.sintese) md.push(`Síntese: ${i.sintese}`, "");
  if (!i.aceitas.length) md.push("_Nenhuma afirmação aceita — a resposta exibida seria o modo documental._", "");
  i.aceitas.forEach((a, n) => {
    md.push(`${n + 1}. [ ] (${a.natureza}) ${a.texto} — ${a.evidencias.join(", ")}`);
    for (const id of a.evidencias) {
      const e = i.evidencias.find((x) => x.id === id);
      if (e) md.push(`   > ${id} ${e.rotulo}: ${e.texto.slice(0, 400)}`);
    }
  });
  if (i.removidas.length) {
    md.push("", "<details><summary>Removidas pela verificação</summary>", "");
    for (const r of i.removidas) md.push(`- ${r.texto.slice(0, 300)} — **${r.motivos.join("; ")}**`);
    md.push("", "</details>");
  }
  md.push("");
}
fs.writeFileSync(`${base}-revisao.md`, md.join("\n"));
console.log(JSON.stringify(resumo, null, 2));

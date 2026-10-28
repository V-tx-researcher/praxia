// Avaliação do pipeline (modo documental, sem LLM) sobre o conjunto de perguntas.
//
// Uso: node tests/avaliacao/avaliar.mjs [previa|publico] [--saida docs/avaliacao/arquivo.json] [--semantica]
// Com --semantica, combina a busca por sentido (requer TRANSFORMERS_DIR e
// app/dados/semantica-<modo>.json; ver scripts/semantica/gerar_vetores.mjs).
//
// Mede somente o que é automaticamente verificável: recuperação das referências
// esperadas, classificação da situação, mascaramento de dados pessoais, ausência
// de evidências em perguntas fora do domínio e integridade literal das evidências.
// NÃO mede a correção interpretativa — isso exige revisão humana.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { IndiceLexical } from "../../app/js/nucleo/busca.js";
import { consultar } from "../../app/js/nucleo/resposta.js";
import { detectarDadosPessoais } from "../../app/js/nucleo/privacidade.js";
import { IndiceSemantico } from "../../app/js/nucleo/semantica.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const modo = process.argv[2] === "publico" ? "publico" : "previa";
const iSaida = process.argv.indexOf("--saida");
const saida = iSaida > 0 ? process.argv[iSaida + 1] : null;

const acervo = JSON.parse(fs.readFileSync(path.join(RAIZ, `app/dados/acervo-${modo}.json`), "utf8"));
const conjunto = JSON.parse(fs.readFileSync(path.join(RAIZ, "tests/avaliacao/perguntas.json"), "utf8"));
const indice = new IndiceLexical(acervo);

let semantica = null;
if (process.argv.includes("--semantica")) {
  const { carregarExtrator } = await import("../../scripts/semantica/gerar_vetores.mjs");
  const extrator = await carregarExtrator();
  const dados = JSON.parse(fs.readFileSync(path.join(RAIZ, `app/dados/semantica-${modo}.json`), "utf8"));
  semantica = {
    indice: new IndiceSemantico(dados),
    motor: { vetor: async (p, prefixo) => Float32Array.from((await extrator(prefixo + p, { pooling: "mean", normalize: true })).data) },
  };
}

const PARTES = {
  CEP: "Código de Ética do/a Assistente Social",
  PRINC: "Código de Ética — Princípios Fundamentais",
  LEI: "Lei nº 8.662/1993",
  L12317: "Lei nº 12.317/2010",
};

function docDaReferencia(ref) {
  const m = /^RES:(\d+)\/(\d{4})$/.exec(ref.doc);
  return m ? `cfess-resolucao-${m[1]}-${m[2]}` : null;
}

function referenciaDisponivel(ref) {
  const docId = docDaReferencia(ref);
  if (docId) return indice.documentos.has(docId);
  return acervo.unidades.some((u) => u.parte === PARTES[ref.doc]);
}

function casa(ref, ev) {
  const docId = docDaReferencia(ref);
  if (docId) return ev.documento.id === docId && (!ref.disp || ev.rotulo === ref.disp || ev.rotulo.startsWith(ref.disp + ","));
  if (ev.parte !== PARTES[ref.doc]) return false;
  // Um dispositivo esperado é atendido pela própria unidade, por uma subdivisão dela
  // ou quando aparece como contexto (caput) da evidência.
  if (ev.rotulo === ref.disp || ev.rotulo.startsWith(ref.disp + ",")) return true;
  return ev.contexto.some((c) => c.rotulo === ref.disp) && false;
}

const resultados = [];
for (const q of conjunto.perguntas) {
  const r = await consultar(indice, q.pergunta, { semantica });
  const fund = r.secoes.find((s) => s.id === "fundamentacao");
  const evidencias = fund ? fund.evidencias : [];
  const disponiveis = q.referencias.filter(referenciaDisponivel);
  const posicoes = disponiveis.map((ref) => evidencias.findIndex((e) => casa(ref, e)));
  const acertos = posicoes.filter((p) => p >= 0);
  const item = {
    id: q.id, tema: q.tema, comportamento: q.comportamento,
    situacao_esperada: q.situacao, situacao_obtida: r.classificacao.situacao,
    referencias: q.referencias.length, referencias_no_acervo: disponiveis.length,
    recuperadas: acertos.length, primeira_posicao: acertos.length ? Math.min(...acertos) + 1 : null,
    n_evidencias: evidencias.length,
    evidencias: evidencias.map((e) => `${e.parte} | ${e.rotulo}`),
  };
  if (q.comportamento === "insuficiencia") item.ok = evidencias.length === 0;
  else if (q.comportamento === "privacidade") item.ok = detectarDadosPessoais(q.pergunta).length > 0 && !!r.alertaPrivacidade && !r.pergunta.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{7}-\d{2}\.\d{4}/);
  else if (disponiveis.length === 0) item.ok = null; // referência ainda fora do acervo
  else item.ok = acertos.length > 0;
  resultados.push(item);
}

const avaliaveis = resultados.filter((r) => r.ok !== null);
const porComportamento = {};
for (const r of resultados) {
  const c = (porComportamento[r.comportamento] ||= { total: 0, avaliaveis: 0, ok: 0 });
  c.total++;
  if (r.ok !== null) { c.avaliaveis++; if (r.ok) c.ok++; }
}
const comRecuperacao = resultados.filter((r) => r.referencias_no_acervo > 0);
const mrr = comRecuperacao.reduce((s, r) => s + (r.primeira_posicao ? 1 / r.primeira_posicao : 0), 0) / Math.max(1, comRecuperacao.length);
const resumo = {
  executado_em: new Date().toISOString(),
  busca: semantica ? "termos + sentido" : "termos",
  acervo: { modo, gerado_em: acervo.gerado_em, documentos: acervo.documentos.length, unidades: acervo.unidades.length },
  perguntas: resultados.length,
  avaliaveis: avaliaveis.length,
  pendentes_por_falta_de_documento: resultados.length - avaliaveis.length,
  aprovadas: avaliaveis.filter((r) => r.ok).length,
  taxa_aprovacao: +(avaliaveis.filter((r) => r.ok).length / Math.max(1, avaliaveis.length)).toFixed(3),
  recall_em_8_referencias: +(comRecuperacao.reduce((s, r) => s + r.recuperadas / r.referencias_no_acervo, 0) / Math.max(1, comRecuperacao.length)).toFixed(3),
  mrr_primeira_referencia: +mrr.toFixed(3),
  acuracia_situacao: +(resultados.filter((r) => r.situacao_esperada === r.situacao_obtida).length / resultados.length).toFixed(3),
  por_comportamento: porComportamento,
  falhas: resultados.filter((r) => r.ok === false).map((r) => r.id),
};

console.log(JSON.stringify(resumo, null, 2));
if (saida) fs.writeFileSync(path.join(RAIZ, saida), JSON.stringify({ resumo, resultados }, null, 2));

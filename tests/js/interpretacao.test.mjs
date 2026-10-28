// Testes da camada 2 (D41): orientações institucionais do CFESS, dos CRESS e da ABEPSS.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { IndiceLexical } from "../../app/js/nucleo/busca.js";
import { consultar } from "../../app/js/nucleo/resposta.js";
import { ajustarNatureza, selecionarOrientacoes, transcreveNorma } from "../../app/js/nucleo/interpretacao.js";
import { montarMensagens } from "../../app/js/llm/prompt.js";
import { classificar } from "../../app/js/nucleo/classificacao.js";
import { referenciaABNT } from "../../app/js/nucleo/referencia.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf-8"));

const NORMAS = {
  documentos: [{ id: "doc-a", titulo: "Código", tipo: "codigo_etica", tipo_rotulo: "Código de Ética", orgao: "CFESS", ano: 1993,
    situacao: "vigente_confirmada", situacao_rotulo: "Vigente", conferido: true, fonte_oficial_url: "https://exemplo.invalid/a",
    arquivo_url: "https://exemplo.invalid/a.pdf", sha256: "0".repeat(64), partes: [], alteracoes: {} }],
  unidades: [{ id: "doc-a#art-17", doc: "doc-a", parte: "Código", parte_tipo: "normativa", tipo: "artigo", rotulo: "Art. 17",
    hierarquia: [], pai: null, pagina: 36, texto: "Art. 17 É vedado ao/à assistente social revelar sigilo profissional." },
    ...["supervisionar estagiário", "jornada de trinta horas", "inscrição no conselho", "visita de fiscalização"].map((t, i) =>
      ({ id: `doc-a#art-${i + 1}`, doc: "doc-a", parte: "Código", parte_tipo: "normativa", tipo: "artigo", rotulo: `Art. ${i + 1}`,
        hierarquia: [], pai: null, pagina: i + 1, texto: `Art. ${i + 1} Trata de ${t}.` }))],
};
const orient = (id, texto, pagina = 10) => ({ id: `nota-x#p${pagina}-${id}`, doc: "nota-x", parte: "Nota", parte_tipo: "orientativa",
  tipo: "trecho", rotulo: `p. ${pagina}`, hierarquia: [], pai: null, pagina, pagina_fim: pagina, texto });
const INTERP = {
  documentos: [{ id: "nota-x", camada: 2, titulo: "Nota técnica sobre sigilo", tipo: "nota_tecnica", tipo_rotulo: "Nota técnica",
    orgao: "CFESS", ano: 2019, autoria: "MATOS, Maurílio Castro de", situacao: "orientacao_institucional",
    situacao_rotulo: "Orientação institucional (não é norma)", conferido: false, fonte_oficial_url: "https://exemplo.invalid/n",
    arquivo_url: "https://exemplo.invalid/n.pdf", sha256: "2".repeat(64), partes: [], alteracoes: {}, indicacoes_portal: [],
    referencia: "MATOS, Maurílio Castro de. Nota técnica sobre sigilo. Brasília, DF: CFESS, 2019. Disponível em: https://exemplo.invalid/n.pdf." }],
  unidades: [
    orient(1, "O compartilhamento de prontuários deve respeitar o sigilo profissional: revelar apenas o estritamente necessário, com finalidade de proteção do usuário."),
    orient(2, "Art. 17 É vedado ao/à assistente social revelar sigilo profissional. Art. 18 A quebra do sigilo só é admissível.", 11),
    // Trechos de outros assuntos: sem eles, nenhuma palavra seria rara o bastante para contar.
    ...["supervisão de estágio e plano de trabalho", "jornada semanal de trinta horas", "inscrição no conselho regional",
      "fiscalização e visita de orientação", "estudo social e laudo pericial", "direitos humanos e combate ao racismo"]
      .map((t, i) => orient(10 + i, `Texto sobre ${t}, com orientações gerais para a categoria.`, 20 + i)),
  ],
};

test("trecho que só transcreve artigos não conta como orientação", () => {
  assert.ok(transcreveNorma("Art. 15 Constitui direito do/a assistente social manter o sigilo profissional."));
  assert.ok(transcreveNorma("“f – fornecer à população usuária, quando solicitado, informações"));
  assert.ok(!transcreveNorma("Segundo a nota, o sigilo não impede o trabalho em equipe, conforme o art. 16."));
});

test("seleção: só trecho explicativo, com fonte e identificador O", () => {
  const o = selecionarOrientacoes(new IndiceLexical(INTERP), "posso revelar sigilo profissional do prontuário?");
  assert.equal(o.length, 1);
  assert.equal(o[0].id, "O1");
  assert.equal(o[0].camada, 2);
  assert.match(o[0].texto, /estritamente necessário/);
});

test("orientação só acompanha resposta que já tem base normativa", async () => {
  const r = await consultar(new IndiceLexical(NORMAS), "receita de bolo", { interpretacao: new IndiceLexical(INTERP) });
  assert.ok(!r.secoes.some((s) => s.id === "orientacoes"));
  const r2 = await consultar(new IndiceLexical(NORMAS), "posso revelar sigilo profissional do prontuário?",
    { interpretacao: new IndiceLexical(INTERP) });
  const sec = r2.secoes.find((s) => s.id === "orientacoes");
  assert.equal(sec.orientacoes.length, 1);
  // documento não conferido → aviso de prévia
  assert.ok(r2.secoes.find((s) => s.id === "atencao").itens.some((t) => t.startsWith("PRÉVIA INTERNA")));
});

test("IA: afirmação apoiada só em orientação nunca vira 'o que a norma estabelece'", async () => {
  const motor = { analisar: async ({ evidencias }) => {
    assert.ok(evidencias.some((e) => e.id === "O1"));
    return { sintese_questao: "s", aspectos_atencao: [], lacunas: [], fundamentacao_suficiente: true, afirmacoes: [
      { texto: "É vedado «revelar sigilo profissional».", natureza: "norma_expressa", evidencias: ["E1"] },
      { texto: "Segundo nota técnica do CFESS, deve-se revelar «apenas o estritamente necessário» do sigilo profissional.",
        natureza: "norma_expressa", evidencias: ["O1"] },
    ] };
  } };
  const r = await consultar(new IndiceLexical(NORMAS), "posso revelar sigilo profissional do prontuário?",
    { interpretacao: new IndiceLexical(INTERP), motorLLM: motor });
  const af = r.secoes.find((s) => s.id === "analise").afirmacoes;
  assert.deepEqual(af.map((a) => a.natureza), ["norma_expressa", "orientacao"]);
});

test("ajuste de natureza: misto continua; só orientação vira orientação", () => {
  const porId = new Map([["E1", { camada: 1 }], ["O1", { camada: 2 }]]);
  const af = ajustarNatureza([{ natureza: "norma_expressa", evidencias: ["E1", "O1"] },
    { natureza: "interpretacao", evidencias: ["O1"] }], porId);
  assert.deepEqual(af.map((a) => a.natureza), ["norma_expressa", "orientacao"]);
});

test("instruções: orientação vai marcada como 'não é norma', com órgão e título", () => {
  const o = selecionarOrientacoes(new IndiceLexical(INTERP), "posso revelar sigilo profissional do prontuário?");
  const [, usuario] = montarMensagens({ pergunta: "x", classificacao: classificar("x"), evidencias: o });
  assert.match(usuario.content, /<evidencia id="O1">\nOrientação institucional \(não é norma\) — CFESS: Nota técnica sobre sigilo \(2019\)/);
  assert.ok(!/Situação normativa/.test(usuario.content));
  const sistema = montarMensagens({ pergunta: "x", classificacao: classificar("x"), evidencias: [] })[0].content;
  assert.match(sistema, /Nunca as marque como "norma_expressa"/);
});

test("referência ABNT da orientação, com página na citação", () => {
  const ind = new IndiceLexical(INTERP);
  const { referencia, citacao } = referenciaABNT(ind.documentos.get("nota-x"), ind.unidades[0], new Date(2026, 9, 28));
  assert.match(referencia, /^MATOS, Maurílio Castro de\. Nota técnica sobre sigilo\..* Acesso em: 28 out\. 2026\.$/);
  assert.equal(citacao, "(MATOS, 2019, p. 10)");
});

test("índices da camada 2: público só com conferidos; prévia fora da publicação", () => {
  const cfg = ler("dados/configuracao/camada2.json");
  const conferidos = new Set(cfg.documentos.filter((d) => d.conferido).map((d) => d.id));
  const pub = ler("app/dados/interpretacao-publico.json");
  for (const d of pub.documentos) assert.ok(conferidos.has(d.id) && d.conferido, d.id);
  assert.ok(/interpretacao-previa\.json/.test(fs.readFileSync(path.join(RAIZ, "scripts/preparar_publicacao.py"), "utf-8")));
  for (const d of cfg.documentos) assert.ok(["CFESS", "ABEPSS"].includes(d.orgao) || /^CRESS-[A-Z]{2}$/.test(d.orgao), d.id);
});

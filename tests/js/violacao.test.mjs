import { test } from "node:test";
import assert from "node:assert/strict";
const { recomendacaoFiscalizacao, territorioCitado } = await import("../../app/js/nucleo/violacao.js");

test("identifica o CRESS do estado citado", () => {
  const r = recomendacaoFiscalizacao("Trabalho em Minas Gerais e minha chefe mandou eu assinar laudo de outra pessoa");
  assert.deepEqual(r.cress.map((c) => c.sigla), ["CRESS-MG"]);
  assert.match(r.texto, /CRESS-MG \(Minas Gerais\)/);
  assert.match(r.texto, /agente fiscal/);
  assert.equal(r.semUF, false);
});

test("Mato Grosso do Sul não vira também Mato Grosso", () => {
  assert.deepEqual(territorioCitado("sou de mato grosso do sul"), ["MS"]);
});

test("sem estado: recomendação genérica com dica", () => {
  const r = recomendacaoFiscalizacao("me pediram pra fazer visita sem condições, pode isso?");
  assert.equal(r.cress.length, 0);
  assert.equal(r.semUF, true);
  assert.match(r.texto, /CRESS do estado onde você trabalha/);
  assert.match(r.comoAchar, /Google/);
});

test("não traz telefone nem dados da pergunta no link de busca", () => {
  const r = recomendacaoFiscalizacao("No CRESS-SP, a Maria me pediu sigilo");
  assert.doesNotMatch(r.cress[0].busca, /Maria|sigilo/);
  assert.doesNotMatch(r.texto, /\d{4,}/);
});

const { conferirFrases, dividirFrases, comContexto } = await import("../../app/js/nucleo/chat.js");

test("não quebra frase em nº 1.114/2025 nem em Art. 16 (aviso falso de sem fonte)", () => {
  const t = "Lidar com desrespeito no ambiente de trabalho é desgastante. Tudo indica que as relações em equipes devem se pautar pela observância das normativas, conforme a Resolução nº 1.114/2025 [B2]. Além disso, o Código de Ética, em seu Art. 16, parágrafo único, estabelece limites [B5]. É fundamental a leitura integral dessas normativas para confirmar como a profissão se orienta.";
  assert.equal(dividirFrases(t).length, 4);
  const fontes = new Map([["B2", "relações em equipes normativas observância resolução"], ["B5", "código ética limites parágrafo único informações"]]);
  assert.doesNotMatch(conferirFrases(t, fontes), /⟦SF⟧/);
});

test("ainda avisa frase sobre norma sem fonte", () => {
  const t = "Entendo sua dúvida. A Resolução do CFESS estabelece que a chefia deve punir quem ofende colegas.";
  assert.match(conferirFrases(t, new Map()), /⟦SF⟧/);
});

test("continuação curta herda a pergunta anterior; pergunta nova não", () => {
  const ant = "Um outro profissional falou que eu não presto para ser assistente social";
  assert.match(comContexto("Mas foi outro assistente social que me falou isso", ant), /não presto/);
  assert.equal(comContexto("Existe resolução sobre teletrabalho para assistentes sociais em hospitais públicos do estado?", ant).includes("presto"), false);
  assert.equal(comContexto("qualquer coisa", ""), "qualquer coisa");
});

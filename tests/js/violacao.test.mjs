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

import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS, categoriaDe, maisProximoPorCategoria } from "../../app/js/nucleo/categorias.js";

const doc = (tipoId, orgao = "CFESS") => ({ tipoId, orgao });

test("cada tipo do acervo atual cai numa categoria própria", () => {
  assert.equal(categoriaDe(doc("resolucao")).id, "resolucao");
  assert.equal(categoriaDe(doc("codigo_etica")).id, "codigo");
  assert.equal(categoriaDe(doc("orientacao_normativa")).id, "orientacao_normativa");
  assert.equal(categoriaDe(doc("nota_tecnica")).id, "tecnico");
  assert.equal(categoriaDe(doc("parecer_juridico")).id, "tecnico");
  assert.equal(categoriaDe(doc("documento_orientativo", "CRESS-PB")).id, "orientativo");
  assert.equal(categoriaDe(doc("politica_institucional", "ABEPSS")).id, "formacao");
  assert.equal(categoriaDe(doc("lei")).id, "lei");
  assert.equal(categoriaDe(doc("tipo_novo")).id, "outro");
  // o livreto do Código de Ética traz as leis da profissão: classificadas pela parte
  assert.equal(categoriaDe(doc("codigo_etica"), "Lei nº 8.662/1993").id, "lei");
  assert.equal(categoriaDe(doc("codigo_etica"), "Código de Ética do/a Assistente Social").id, "codigo");
});

test("mostra o primeiro de cada categoria, na ordem das categorias, preferindo o que se aplica", () => {
  const itens = [
    { id: "E1", documento: doc("resolucao"), prioridade: "complementar" },
    { id: "E2", documento: doc("codigo_etica"), prioridade: "principal" },
    { id: "E3", documento: doc("resolucao"), prioridade: "relacionada" },
    { id: "O1", documento: doc("nota_tecnica") },
  ];
  const r = maisProximoPorCategoria(itens);
  assert.deepEqual(r.map((x) => [x.categoria.id, x.item.id]), [["codigo", "E2"], ["resolucao", "E3"], ["tecnico", "O1"]]);
  assert.ok(CATEGORIAS.every((c) => c.rotulo && c.descricao));
});

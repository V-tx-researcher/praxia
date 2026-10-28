// Testes da literatura crítica (camada 3, D40).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { POSICOES, chaveNorma, filtrarLeituras, leiturasDoDocumento, leiturasParaEvidencias } from "../../app/js/nucleo/literatura.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf-8"));

const item = (id, normas, extra = {}) => ({ id, titulo: `Texto ${id}`, autoria: "AUTORA, A.", ano: "2020", tipo: "artigo",
  normas, outras_normas: [], temas: [], resumo: "", posicao: "critica", blocos: ["1"], link: "https://exemplo.invalid", ...extra });
const LIT = { itens: [
  item("a", ["cfess-codigo-etica-1993"]),
  item("b", ["cfess-codigo-etica-1993"]),
  item("c", ["cfess-resolucao-533-2008"], { temas: ["supervisão direta"] }),
  item("d", ["lei-8662"], { titulo: "Atribuições privativas" }),
  item("e", ["cfess-resolucao-533-2008"]),
] };
const ev = (doc, prioridade, parte = "") => ({ documento: { id: doc }, prioridade, parte });

test("dispositivo da Lei 8.662 dentro do livreto do Código liga à lei, não ao Código", () => {
  assert.equal(chaveNorma("cfess-codigo-etica-1993", { parte: "Lei nº 8.662/1993" }), "lei-8662");
  assert.equal(chaveNorma("cfess-codigo-etica-1993", { parte: "Código de Ética" }), "cfess-codigo-etica-1993");
  assert.equal(chaveNorma("cfess-resolucao-533-2008"), "cfess-resolucao-533-2008");
});

test("na biblioteca, o Código de Ética mostra também as leituras sobre as leis do livreto", () => {
  assert.deepEqual(leiturasDoDocumento(LIT, "cfess-codigo-etica-1993").map((i) => i.id), ["a", "b", "d"]);
  assert.deepEqual(leiturasDoDocumento(LIT, "cfess-resolucao-533-2008").map((i) => i.id), ["c", "e"]);
});

test("sugestões seguem a prioridade das evidências e as palavras da pergunta", () => {
  const r = leiturasParaEvidencias(LIT, [ev("cfess-resolucao-533-2008", "principal"), ev("cfess-codigo-etica-1993", "complementar")],
    "Como funciona a supervisão direta de estágio?");
  assert.equal(r[0].id, "c");           // norma principal + tema da pergunta
  assert.equal(r[1].id, "e");           // norma principal
  assert.ok(!r.some((i) => i.id === "d")); // Lei 8.662 não está entre as evidências
});

test("sem evidências, nenhuma sugestão", () => {
  assert.deepEqual(leiturasParaEvidencias(LIT, [], "x"), []);
  assert.deepEqual(leiturasParaEvidencias(null, [ev("a", "principal")]), []);
});

test("filtros por posição e texto", () => {
  assert.equal(filtrarLeituras(LIT, { texto: "atribuicoes" }).length, 1);
  assert.equal(filtrarLeituras(LIT, { posicao: "favoravel" }).length, 0);
});

test("literatura.json publicada: normas existem no acervo, links https, posições válidas", () => {
  const lit = ler("app/dados/literatura.json");
  const ids = new Set(ler("app/dados/acervo-publico.json").documentos.map((d) => d.id));
  assert.ok(lit.itens.length > 50);
  for (const i of lit.itens) {
    for (const n of i.normas) assert.ok(ids.has(n) || ["lei-8662", "lei-12317"].includes(n), `${i.id}: norma ${n}`);
    assert.match(i.link, /^https:\/\//, i.id);
    assert.ok(POSICOES[i.posicao], `${i.id}: posição ${i.posicao}`);
    assert.ok(i.referencia.includes(i.link), `${i.id}: referência sem link`);
    assert.ok(i.link_conferido, `${i.id}: link não conferido`);
    assert.ok(i.link_conferido.ok || i.link_conferido.bloqueio_robo, `${i.id}: link quebrado publicado`);
  }
  assert.equal(new Set(lit.itens.map((i) => i.titulo)).size, lit.itens.length, "títulos repetidos");
});

test("a IA nunca recebe a literatura (camada 3 fora do contexto)", () => {
  for (const f of ["app/js/llm/prompt.js", "app/js/llm/motor.js", "app/js/nucleo/resposta.js", "app/js/nucleo/evidencias.js"]) {
    assert.ok(!/literatura/i.test(fs.readFileSync(path.join(RAIZ, f), "utf-8")), f);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";

const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
const { bloqueioPrivacidade, montarTrechos, partesDoTexto, pedirExplicacao, situacaoLimite } = await import("../../app/js/nucleo/chat.js");
const cfg = { endpoint: "https://exemplo.invalid/", limiteDiario: 2, intervaloSegundos: 30 };

test("bloqueia pergunta com dado que identifica pessoas e libera pergunta geral", () => {
  assert.match(bloqueioPrivacidade("A usuária Maria Souza, CPF 123.456.789-00, pediu o relatório"), /não será enviada/);
  assert.equal(bloqueioPrivacidade("Posso compartilhar informações com a equipe multidisciplinar?"), null);
});

test("envia no máximo 8 trechos, sem os que provavelmente não se aplicam", () => {
  const d = { titulo: "Res.", tipoId: "resolucao", orgao: "CFESS" };
  const ev = Array.from({ length: 10 }, (_, i) => ({ id: `E${i + 1}`, documento: d, tipo: "artigo", rotulo: "Art. 1º", texto: "t", prioridade: i === 0 ? "complementar" : "principal" }));
  const or = [{ id: "O1", documento: { titulo: "Nota", tipoId: "nota_tecnica", orgao: "CFESS" }, tipo: "trecho", pagina: 3, texto: "o" }];
  const t = montarTrechos(ev, or);
  assert.equal(t.length, 8);
  assert.ok(!t.some((x) => x.id === "E1"));
  assert.ok(t.some((x) => x.id === "O1" && x.categoria === "Notas técnicas e pareceres"));
});

test("limite diário e intervalo por navegador; pedido que falha também conta", async () => {
  mem.clear();
  globalThis.fetch = async () => new Response(JSON.stringify({ erro: "x" }), { status: 502 });
  assert.equal(situacaoLimite(cfg).pode, true);
  assert.ok((await pedirExplicacao(cfg, "pergunta", [])).erro);
  const s = situacaoLimite(cfg);
  assert.equal(s.pode, false);
  assert.ok(s.esperarSegundos > 0);
  assert.equal(situacaoLimite(cfg, Date.now() + 31000).pode, true);
  await pedirExplicacao(cfg, "pergunta", []);
  const fim = situacaoLimite(cfg, Date.now() + 31000);
  assert.equal(fim.pode, false);
  assert.equal(fim.restantes, 0);
});

test("texto da IA vira partes seguras; só referências existentes viram link", () => {
  const p = partesDoTexto("**Norma**: veja [E1] e [E9].\n\nFim [O1]", new Set(["E1", "O1"]));
  assert.deepEqual(p[0].filter((x) => x.tipo === "ref").map((x) => x.valor), ["E1"]);
  assert.ok(p[0].some((x) => x.tipo === "texto" && x.valor.includes("[E9]")));
  assert.ok(!JSON.stringify(p).includes("**"));
  assert.equal(p[1].at(-1).valor, "O1");
});

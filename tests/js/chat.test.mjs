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

test("grupos de referências como [E2, E4] viram dois links", () => {
  const p = partesDoTexto("Veja [E2, E4].", new Set(["E2", "E4"]));
  assert.deepEqual(p[0].filter((x) => x.tipo === "ref").map((x) => x.valor), ["E2", "E4"]);
});

test("D56: frase que fala de documento sem fonte recebe aviso; com fonte pertinente não", async () => {
  const { conferirFrases, partesDoTexto } = await import("../../app/js/nucleo/chat.js");
  const fontes = new Map([["P2", "É direito do assistente social dispor de condições de trabalho condignas, seja em entidade pública ou privada."]]);
  const txt = "As normas indicam o direito a condições de trabalho condignas em entidade pública ou privada [P2]. A literatura da categoria frequentemente aponta o registro formal das condições inadequadas junto à gestão.";
  const saida = conferirFrases(txt, fontes);
  assert.ok(!/\[P2\]\.? ⟦/.test(saida));
  assert.match(saida, /gestão\. ⟦SF⟧|gestão\.? ?⟦SF⟧/);
  const partes = partesDoTexto(saida, new Set(["P2"])).flat();
  assert.ok(partes.some((p) => p.tipo === "aviso"));
  const fraca = conferirFrases("O Código de Ética proíbe cobrança de honorários abusivos em clínicas veterinárias [P2].", fontes);
  assert.match(fraca, /⟦FR⟧/);
});

test("D56: frase de ressalva não recebe aviso", async () => {
  const { conferirFrases } = await import("../../app/js/nucleo/chat.js");
  assert.doesNotMatch(conferirFrases("Cumpre ressaltar que tais orientações não substituem as normas em vigor, mas servem de subsídio.", new Map()), /⟦/);
});

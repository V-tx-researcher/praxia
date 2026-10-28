// Mostra, para cada pergunta do conjunto de avaliação, as orientações institucionais
// (camada 2, D41) que acompanhariam a resposta. Serve para conferir pertinência à mão
// e para medir quantas respostas ganham orientação.
// Uso: node tests/avaliacao/orientacoes.mjs [previa|publico] [--todas]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IndiceLexical } from "../../app/js/nucleo/busca.js";
import { consultar } from "../../app/js/nucleo/resposta.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const modo = process.argv[2] === "publico" ? "publico" : "previa";
const ler = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf-8"));
const indice = new IndiceLexical(ler("app/dados/acervo-publico.json"));
const interpretacao = new IndiceLexical(ler(`app/dados/interpretacao-${modo}.json`));
const { perguntas } = ler("tests/avaliacao/perguntas.json");

let com = 0;
let respondidas = 0;
const porDoc = new Map();
for (const q of perguntas) {
  const r = await consultar(indice, q.pergunta, { interpretacao });
  if (r.insuficiente) continue;
  respondidas++;
  const sec = r.secoes.find((s) => s.id === "orientacoes");
  if (sec) com++;
  for (const o of sec?.orientacoes || []) porDoc.set(o.documento.id, (porDoc.get(o.documento.id) || 0) + 1);
  if (process.argv.includes("--todas") || sec) {
    console.log(`\n# ${q.pergunta}`);
    for (const o of sec?.orientacoes || []) console.log(`  ${o.id} ${o.documento.id} ${o.rotulo} — ${o.texto.slice(0, 150)}`);
  }
}
console.log(`\n${com} de ${respondidas} respostas com orientação institucional`);
console.log([...porDoc].sort((a, b) => b[1] - a[1]).map(([d, n]) => `  ${n} ${d}`).join("\n"));

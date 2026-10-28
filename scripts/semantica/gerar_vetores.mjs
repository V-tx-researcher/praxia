// Gera os vetores de sentido (embeddings) dos trechos do acervo, para a busca por
// sentido opcional (D36). Roda uma vez por versão do acervo, fora do navegador; o
// navegador só calcula o vetor da pergunta.
//
// Modelo: Xenova/multilingual-e5-small (MIT), quantizado (q8), 384 dimensões.
// O E5 exige os prefixos "passage: " (trechos) e "query: " (perguntas).
//
// Uso (na raiz):
//   TRANSFORMERS_DIR=<pasta do pacote @huggingface/transformers> \
//   node scripts/semantica/gerar_vetores.mjs [publico|previa]
// Saída: app/dados/semantica-<modo>.json (vetores int8 em base64).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MODELO = "Xenova/multilingual-e5-small";
export const DIMENSAO = 384;

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function carregarExtrator() {
  const dir = process.env.TRANSFORMERS_DIR;
  if (!dir) throw new Error("defina TRANSFORMERS_DIR com a pasta do pacote @huggingface/transformers");
  const { pipeline, env } = await import(pathToFileURL(path.join(dir, "dist", "transformers.node.mjs")).href);
  env.allowLocalModels = false;
  return pipeline("feature-extraction", MODELO, { dtype: "q8" });
}

// Texto do trecho para o modelo: onde está (norma, dispositivo, títulos), o caput de
// que depende e o próprio texto. Mesma montagem usada na avaliação.
export function textoDoTrecho(u, porId) {
  const pai = u.pai ? porId.get(u.pai) : null;
  const partes = [u.parte, u.rotulo, ...(u.hierarquia || []), pai ? pai.texto : "", u.texto];
  return "passage: " + partes.filter(Boolean).join(". ").replace(/\s+/g, " ").slice(0, 1500);
}

export async function vetorizar(extrator, textos, lote = 16, aoProgresso = () => {}) {
  const saida = [];
  for (let i = 0; i < textos.length; i += lote) {
    const t = await extrator(textos.slice(i, i + lote), { pooling: "mean", normalize: true });
    const dados = t.tolist();
    saida.push(...dados);
    aoProgresso(Math.min(i + lote, textos.length), textos.length);
  }
  return saida;
}

// int8 com escala fixa: vetores normalizados têm componentes em [-1, 1].
export function quantizar(vetores) {
  const buf = new Int8Array(vetores.length * DIMENSAO);
  vetores.forEach((v, i) => v.forEach((x, j) => { buf[i * DIMENSAO + j] = Math.max(-127, Math.min(127, Math.round(x * 127))); }));
  return Buffer.from(buf.buffer).toString("base64");
}

async function main() {
  const modo = process.argv[2] === "previa" ? "previa" : "publico";
  const acervo = JSON.parse(fs.readFileSync(path.join(RAIZ, `app/dados/acervo-${modo}.json`), "utf8"));
  const porId = new Map(acervo.unidades.map((u) => [u.id, u]));
  const extrator = await carregarExtrator();
  const textos = acervo.unidades.map((u) => textoDoTrecho(u, porId));
  const inicio = Date.now();
  const vetores = await vetorizar(extrator, textos, 16, (n, total) => {
    if (n % 160 === 0 || n === total) process.stderr.write(`  ${n}/${total}\n`);
  });
  const destino = path.join(RAIZ, `app/dados/semantica-${modo}.json`);
  fs.writeFileSync(destino, JSON.stringify({
    modelo: MODELO, dimensao: DIMENSAO, quantizacao: "int8/127", prefixo_consulta: "query: ",
    acervo_gerado_em: acervo.gerado_em, gerado_em: new Date().toISOString(),
    ids: acervo.unidades.map((u) => u.id), vetores: quantizar(vetores),
  }));
  console.log(`${vetores.length} vetores em ${((Date.now() - inicio) / 1000).toFixed(0)} s → ${destino}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

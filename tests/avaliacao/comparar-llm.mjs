// Compara rodadas verificadas de modelos de IA local (saída de reverificar-llm.mjs).
// Além do que a verificação automática mede, calcula a pertinência: em quantas
// perguntas do tipo "responder" alguma frase aceita se apoia num dispositivo esperado
// pelo gabarito (tests/avaliacao/perguntas.json — gabarito ainda não revisado).
//
// Uso: node tests/avaliacao/comparar-llm.mjs docs/avaliacao/llm-*-verificado.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gabarito = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, "tests/avaliacao/perguntas.json"), "utf8"))
  .perguntas.map((q) => [q.id, q]));
const PARTES = { CEP: "Código de Ética do/a Assistente Social", PRINC: "Código de Ética — Princípios Fundamentais",
  LEI: "Lei nº 8.662/1993", L12317: "Lei nº 12.317/2010" };

// Rótulo da evidência: "<parte> | <rotulo>".
function casa(ref, rotuloEvidencia) {
  const [parte, rotulo] = rotuloEvidencia.split(" | ");
  const m = /^RES:(\d+)\/(\d{4})$/.exec(ref.doc);
  const alvoRotulo = !ref.disp || rotulo === ref.disp || rotulo?.startsWith(ref.disp + ",");
  if (m) return new RegExp(`\\b${Number(m[1]).toLocaleString("pt-BR").replace(".", "\\.?")}/${m[2]}\\b`).test(parte) && alvoRotulo;
  return parte === PARTES[ref.doc] && alvoRotulo;
}

const linhas = [];
for (const arq of process.argv.slice(2)) {
  const { resumo, itens } = JSON.parse(fs.readFileSync(arq, "utf8"));
  let avaliaveis = 0;
  let pertinentes = 0;
  let respondeuInsuficiencia = 0;
  for (const it of itens) {
    const q = gabarito.get(it.id);
    if (!q) continue;
    if (q.comportamento === "insuficiencia" && it.aceitas.length) respondeuInsuficiencia++;
    if (!q.referencias?.length) continue;
    avaliaveis++;
    const rotulos = new Map(it.evidencias.map((e) => [e.id, e.rotulo]));
    const citados = it.aceitas.flatMap((a) => (a.evidencias || []).map((id) => rotulos.get(id)).filter(Boolean));
    if (q.referencias.some((ref) => citados.some((r) => casa(ref, r)))) pertinentes++;
  }
  linhas.push({ modelo: resumo.modelo, perguntas: resumo.perguntas, com_analise: resumo.com_analise_aceita,
    frases_aceitas: resumo.afirmacoes_aceitas, descarte: resumo.taxa_remocao, falhas_formato: resumo.falhas_de_formato.length,
    pertinencia: `${pertinentes}/${avaliaveis}`, respondeu_fora_do_dominio: respondeuInsuficiencia,
    tempo_medio_s: resumo.tempo_medio_s });
}
console.table(linhas);
console.log(JSON.stringify(linhas));

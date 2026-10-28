// Roda a avaliação da LLM local (app/dev/avaliar-llm.html) num Chrome ou Edge sem
// janela, com a placa de vídeo (WebGPU), e grava a rodada bruta em docs/avaliacao.
// O perfil do navegador é reaproveitado entre rodadas, para não baixar o modelo de novo.
//
// Uso (com o app servido em http://localhost:8765):
//   node scripts/avaliar_llm.mjs <modelo> <ids separados por vírgula> [pasta-do-perfil] [chrome|edge]
// Depois: node tests/avaliacao/reverificar-llm.mjs docs/avaliacao/llm-<modelo>-bruto.json

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [modelo, ids, perfilArg, navArg] = process.argv.slice(2);
if (!modelo || !ids) {
  console.error("uso: node scripts/avaliar_llm.mjs <modelo> <ids> [perfil] [chrome|edge]");
  process.exit(1);
}
const EXE = navArg === "edge"
  ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  : "C:/Program Files/Google/Chrome/Application/chrome.exe";
const perfil = perfilArg || path.join(os.tmpdir(), "gpecss-llm-perfil");
fs.mkdirSync(perfil, { recursive: true });
const URL_AVAL = `http://localhost:8765/dev/avaliar-llm.html?modelo=${encodeURIComponent(modelo)}&ids=${ids}&acervo=publico`;
const LIMITE_MS = 3 * 60 * 60 * 1000;
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

const proc = spawn(EXE, ["--headless=new", "--remote-debugging-port=9422", `--user-data-dir=${perfil}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", URL_AVAL], { stdio: "ignore" });

let ws;
for (let i = 0; i < 100 && !ws; i++) {
  try {
    const alvos = await (await fetch("http://127.0.0.1:9422/json")).json();
    ws = alvos.find((a) => a.type === "page" && a.url.includes("avaliar-llm"))?.webSocketDebuggerUrl;
  } catch { /* iniciando */ }
  if (!ws) await espera(300);
}
if (!ws) { proc.kill(); throw new Error("navegador não respondeu"); }
const sock = new WebSocket(ws);
await new Promise((ok) => { sock.onopen = ok; });
let n = 0;
const pendentes = new Map();
const erros = [];
sock.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m.result); pendentes.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
};
const enviar = (method, params = {}) => new Promise((ok) => { const id = ++n; pendentes.set(id, ok); sock.send(JSON.stringify({ id, method, params })); });
await enviar("Runtime.enable");
const avaliar = async (expr) => (await enviar("Runtime.evaluate", { expression: expr, returnByValue: true }))?.result?.value;

const t0 = Date.now();
let ultimo = "";
let resultado = null;
while (Date.now() - t0 < LIMITE_MS) {
  await espera(5000);
  const estado = await avaliar(`JSON.stringify({ r: window.resultadoAvaliacao ? { concluido: window.resultadoAvaliacao.concluido, n: window.resultadoAvaliacao.resultados.length } : null,
    p: window.progressoModelo || "", log: (document.getElementById("log")?.textContent || "").slice(-300) })`);
  if (!estado) continue;
  const e = JSON.parse(estado);
  const linha = e.r ? `respondidas: ${e.r.n}` : `carregando: ${e.p.slice(0, 110)}`;
  if (linha !== ultimo) { console.error(`[${Math.round((Date.now() - t0) / 1000)} s] ${linha}`); ultimo = linha; }
  if (erros.length && !e.r) { console.error("erro na página:", erros.slice(-1)[0]); break; }
  if (/Error|falhou|erro/i.test(e.log) && !e.r) { console.error("log:", e.log); break; }
  if (e.r?.concluido) {
    resultado = JSON.parse(await avaliar("JSON.stringify(window.resultadoAvaliacao)"));
    break;
  }
}
sock.close();
proc.kill();
if (!resultado) { console.error("avaliação não concluída", erros.slice(-3)); process.exit(2); }
resultado.navegador = navArg === "edge" ? "edge" : "chrome";
resultado.executado_em = new Date().toISOString();
resultado.reproduzirSemIndicacoes = false;
const destino = path.join(RAIZ, "docs", "avaliacao", `llm-${modelo.toLowerCase().replace(/-q4f16_1-mlc$/, "").replace(/[^a-z0-9.]+/g, "-")}-bruto.json`);
fs.writeFileSync(destino, JSON.stringify(resultado, null, 1));
const tempos = resultado.resultados.map((r) => r.segundos);
console.log(JSON.stringify({ destino, carregamento_s: resultado.carregamentoSegundos, perguntas: tempos.length,
  tempo_medio_s: +(tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1),
  com_afirmacoes_aceitas: resultado.resultados.filter((r) => r.aceitas.length).length }));

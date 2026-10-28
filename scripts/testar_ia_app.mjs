// Teste de ponta a ponta da análise por IA na interface real (como um usuário faria):
// liga a IA nas preferências, faz uma pergunta e espera a análise verificada.
// Usa Chrome sem janela com a placa de vídeo e o mesmo perfil de scripts/avaliar_llm.mjs
// (modelo já baixado). Uso, com o app servido em http://localhost:8765:
//   node scripts/testar_ia_app.mjs "<pergunta>" [saida.png] [--largura=390]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opcoes = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const pergunta = args[0] || "A direção quer acesso aos arquivos e à documentação do Serviço Social. Isso fere o sigilo?";
const saidaPng = args[1] || null;
const largura = Number(opcoes.largura || 1280);
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const perfil = path.join(os.tmpdir(), "gpecss-llm-perfil");
const URL_APP = "http://localhost:8765/";
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

const proc = spawn(EXE, ["--headless=new", "--disk-cache-size=1", "--remote-debugging-port=9423", `--user-data-dir=${perfil}`,
  `--window-size=${largura},900`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", URL_APP], { stdio: "ignore" });
let ws;
for (let i = 0; i < 100 && !ws; i++) {
  try { ws = (await (await fetch("http://127.0.0.1:9423/json")).json()).find((a) => a.type === "page")?.webSocketDebuggerUrl; } catch { /* iniciando */ }
  if (!ws) await espera(300);
}
if (!ws) { proc.kill(); throw new Error("navegador não respondeu"); }
const sock = new WebSocket(ws);
await new Promise((ok) => { sock.onopen = ok; });
let n = 0;
const pend = new Map();
sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
sock.onclose = () => { for (const ok of pend.values()) ok(null); };
const enviar = (method, params = {}) => new Promise((ok) => { const id = ++n; pend.set(id, ok); sock.send(JSON.stringify({ id, method, params })); });
const js = async (expr) => (await enviar("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;

await espera(3000);
await js(`localStorage.setItem("gpecss-preferencia-ia", JSON.stringify({ ativo: true, modelo: "Qwen3-8B-q4f16_1-MLC" })); location.reload(); 1`);
await espera(5000);
const t0 = Date.now();
await js(`(async () => { for (let i = 0; i < 60 && !document.querySelector("#pergunta"); i++) await new Promise(r => setTimeout(r, 500));
  document.querySelector("#pergunta").value = ${JSON.stringify(pergunta)}; document.querySelector("#form-consulta").requestSubmit(); return 1; })()`);
let r = null;
while (Date.now() - t0 < 6 * 60 * 1000) {
  await espera(5000);
  r = JSON.parse(await js(`JSON.stringify({
    afirmacoes: [...document.querySelectorAll("#resultado .afirmacao")].map(a => a.textContent.slice(0, 300)),
    analise: document.querySelector("#t-analise")?.closest("section")?.textContent.slice(0, 300) || "",
    orientacoes: document.querySelectorAll("#t-orientacoes ~ .evidencia, section:has(#t-orientacoes) .evidencia").length,
    estadoIA: document.querySelector("#estado-ia")?.textContent || "", webgpu: !!navigator.gpu,
    etapas: (window.ultimasEtapas || []).filter(e => /análise|verifica|orienta/.test(e.nome)).map(e => e.nome + ": " + e.detalhe) })`) || "null");
  if (r?.afirmacoes.length || /não pôde ser concluída|descartada|Modo documental/.test(r?.analise || "")) break;
}
r.segundos = Math.round((Date.now() - t0) / 1000);
if (saidaPng) {
  await js(`document.querySelector("#t-analise")?.scrollIntoView(); 1`);
  const img = await enviar("Page.captureScreenshot", { format: "png" });
  if (img?.data) fs.writeFileSync(saidaPng, Buffer.from(img.data, "base64"));
}
sock.close();
proc.kill();
console.log(JSON.stringify(r, null, 1));
process.exit(r?.afirmacoes.length ? 0 : 2);

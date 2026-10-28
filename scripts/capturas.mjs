// Teste visual automatizado: abre o app em Chrome e Edge sem janela (headless), em
// tamanhos de celular, tablet e computador, nos temas escuro e claro, faz uma consulta
// de exemplo e salva capturas de tela. Também coleta erros do console.
//
// Uso (com o app servido em http://127.0.0.1:8765):
//   node scripts/capturas.mjs <pasta-de-saida> [url]
// Requer Node 22+ (WebSocket nativo) e Chrome e/ou Edge instalados.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const saida = process.argv[2] || "capturas";
const URL_APP = process.argv[3] || "http://127.0.0.1:8765/";
fs.mkdirSync(saida, { recursive: true });

const NAVEGADORES = [
  ["chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe"],
  ["edge", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"],
].filter(([, p]) => fs.existsSync(p));

const TELAS = [
  { nome: "celular", largura: 375, altura: 812, escala: 2, movel: true },
  { nome: "tablet", largura: 768, altura: 1024, escala: 2, movel: true },
  { nome: "computador", largura: 1366, altura: 900, escala: 1, movel: false },
];

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function abrirNavegador(exe, porta) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "gpecss-cap-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
      const pagina = alvos.find((a) => a.type === "page");
      if (pagina) return { proc, ws: pagina.webSocketDebuggerUrl, perfil };
    } catch { /* ainda iniciando */ }
    await espera(200);
  }
  proc.kill();
  throw new Error("navegador não respondeu");
}

function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, falha } = pendentes.get(m.id);
      pendentes.delete(m.id);
      m.error ? falha(new Error(m.error.message)) : ok(m.result);
    } else if (m.method === "Runtime.exceptionThrown") {
      erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      erros.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    } else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
      erros.push(`${m.params.entry.text} ${m.params.entry.url || ""}`);
    }
  };
  const enviar = (method, params = {}) => new Promise((ok, falha) => {
    const n = ++id;
    pendentes.set(n, { ok, falha });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return new Promise((ok) => { ws.onopen = () => ok({ enviar, erros, fechar: () => ws.close() }); });
}

async function avaliar(cdp, expressao) {
  const r = await cdp.enviar("Runtime.evaluate", { expression: expressao, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "erro ao avaliar");
  return r.result.value;
}

async function capturar(cdp, arquivo) {
  const { data } = await cdp.enviar("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(arquivo, Buffer.from(data, "base64"));
}

const relatorio = [];
let porta = 9333;
for (const [nomeNav, exe] of NAVEGADORES) {
  const nav = await abrirNavegador(exe, porta++);
  const cdp = await conectar(nav.ws);
  await cdp.enviar("Runtime.enable");
  await cdp.enviar("Log.enable");
  await cdp.enviar("Page.enable");
  for (const tela of TELAS) {
    for (const tema of ["escuro", "claro"]) {
      await cdp.enviar("Emulation.setDeviceMetricsOverride", { width: tela.largura, height: tela.altura,
        deviceScaleFactor: tela.escala, mobile: tela.movel });
      await cdp.enviar("Emulation.setTouchEmulationEnabled", { enabled: tela.movel });
      await cdp.enviar("Page.navigate", { url: URL_APP });
      await espera(2500);
      await avaliar(cdp, `(() => { const claro = document.documentElement.getAttribute("data-tema") === "claro";
        if ((${JSON.stringify(tema)} === "claro") !== claro) document.querySelector("#botao-tema").click(); return true; })()`);
      const base = path.join(saida, `${nomeNav}-${tela.nome}-${tema}`);
      await capturar(cdp, `${base}-inicio.png`);
      const info = await avaliar(cdp, `(async () => {
        const b = [...document.querySelectorAll(".exemplo")].find((x) => /sigiloso/.test(x.textContent));
        b.click();
        await new Promise((ok) => setTimeout(ok, 2500));
        document.querySelector("#t-fundamentacao")?.scrollIntoView();
        return { evidencias: document.querySelectorAll(".evidencia").length,
                 rolagemLateral: document.documentElement.scrollWidth > window.innerWidth,
                 largura: window.innerWidth };
      })()`);
      await capturar(cdp, `${base}-resultado.png`);
      relatorio.push({ navegador: nomeNav, tela: tela.nome, tema, ...info });
    }
  }
  relatorio.push({ navegador: nomeNav, errosConsole: [...new Set(cdp.erros)] });
  cdp.fechar();
  nav.proc.kill();
}
console.log(JSON.stringify(relatorio, null, 1));

// Service worker: guarda a interface e o índice para uso com conexão instável ou sem
// conexão. Não guarda perguntas nem respostas. O modelo de IA (quando habilitado) é
// armazenado pelo próprio WebLLM no Cache Storage do navegador, à parte.
//
// Estratégia única: rede primeiro, com limite de espera; sem resposta, cópia local.
// (Guardar o código e buscar a página na rede deixaria versões desencontradas.)
// Versão nova não assume sozinha: a página mostra "Atualizar agora" (mensagem PULAR_ESPERA).
const VERSAO = "gpecss-v0.7.0";
const ESPERA_REDE_MS = 4000;
const ESSENCIAIS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "icones/icone.svg", "icones/icone-192.png", "icones/icone-512.png", "icones/icone-maskable-512.png",
  "icones/apple-touch-icon.png",
  "js/app.js", "js/config.js", "js/tema.js",
  "js/nucleo/texto.js", "js/nucleo/sinonimos.js", "js/nucleo/busca.js", "js/nucleo/classificacao.js",
  "js/nucleo/privacidade.js", "js/nucleo/vigencia.js", "js/nucleo/orientacao.js", "js/nucleo/evidencias.js",
  "js/nucleo/verificacao.js", "js/nucleo/resposta.js", "js/nucleo/rotulos.js", "js/nucleo/snowball-pt.js",
  "js/nucleo/normas-citadas.js", "js/nucleo/referencia.js", "js/nucleo/guia.js", "js/nucleo/semantica.js",
  "js/nucleo/interpretacao.js",
  "js/llm/prompt.js", "js/llm/motor.js", "js/llm/capacidade.js",
  "dados/acervo-publico.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)));
});

self.addEventListener("message", (e) => {
  if (e.data === "PULAR_ESPERA") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("gpecss-") && k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function comLimite(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("tempo de rede esgotado")), ms);
    promessa.then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

async function guardar(req, resp) {
  if (resp && resp.ok && resp.type === "basic") {
    const c = await caches.open(VERSAO);
    await c.put(req, resp.clone());
  }
  return resp;
}

async function redePrimeiro(req, chaveReserva, espera = ESPERA_REDE_MS) {
  try {
    return await guardar(req, await comLimite(fetch(req), espera));
  } catch {
    const local = (await caches.match(req, { ignoreSearch: true })) || (chaveReserva && (await caches.match(chaveReserva)));
    if (local) return local;
    return Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // Orientações institucionais (camada 2, alguns MB): não entram na instalação; ficam guardadas
  // no primeiro uso, com mais tempo de espera para redes lentas.
  const grande = url.pathname.endsWith("/dados/interpretacao-publico.json");
  e.respondWith(redePrimeiro(req, req.mode === "navigate" ? "index.html" : null, grande ? 60000 : ESPERA_REDE_MS));
});

// Service worker: guarda a interface e o índice para uso com conexão instável.
// Não guarda perguntas nem respostas. O modelo de IA (quando habilitado) é
// armazenado pelo próprio WebLLM no Cache Storage do navegador, à parte.
const VERSAO = "gpecss-v0.2.0";
const ESSENCIAIS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest", "icones/icone.svg",
  "js/app.js", "js/config.js",
  "js/nucleo/texto.js", "js/nucleo/sinonimos.js", "js/nucleo/busca.js", "js/nucleo/classificacao.js",
  "js/nucleo/privacidade.js", "js/nucleo/vigencia.js", "js/nucleo/orientacao.js", "js/nucleo/evidencias.js",
  "js/nucleo/verificacao.js", "js/nucleo/resposta.js", "js/nucleo/rotulos.js",
  "js/llm/prompt.js", "js/llm/motor.js", "js/llm/capacidade.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("gpecss-") && k !== VERSAO).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Rede primeiro (o acervo muda), com cópia local como reserva.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(VERSAO).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

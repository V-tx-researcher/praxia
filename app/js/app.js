"use strict";

import { CONFIG } from "./config.js";
import { IndiceLexical } from "./nucleo/busca.js";
import { consultar } from "./nucleo/resposta.js";
import { CANAIS_VERIFICADOS } from "./nucleo/orientacao.js";
import { linkPdf, motivoPrioridade, PRIORIDADES } from "./nucleo/evidencias.js";
import { dataAcesso, referenciaABNT } from "./nucleo/referencia.js";
import { EXEMPLOS, GLOSSARIO } from "./nucleo/guia.js";
import { maisProximoPorCategoria } from "./nucleo/categorias.js";
import { fontesBussola } from "./nucleo/bussola.js";
import { recomendacaoFiscalizacao } from "./nucleo/violacao.js";
import { bloqueioPrivacidade, conferirFrases, escolherFontes, fontesTrilhas, idsCitados, localDe, paraTrecho, partesDoTexto, pedirExplicacao, situacaoLimite, tituloFonte } from "./nucleo/chat.js";
import { categoriaDe } from "./nucleo/categorias.js";
import { ASSUNTOS_ROTULOS } from "./nucleo/rotulos.js";
import { dobrarAcentos } from "./nucleo/texto.js";
import { IndiceSemantico, MotorSemantico, TAMANHO_MODELO_MB } from "./nucleo/semantica.js";
import { MODELOS, MotorWebLLM, WEBLLM_URL, carregarBiblioteca, webgpuDisponivel } from "./llm/motor.js";
import { avaliarModelo, coletarDispositivo, gb, modeloBaixado, removerModelo } from "./llm/capacidade.js";

const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------- utilidades DOM
function el(tag, atributos = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "classe") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

function linkExterno(href, texto) {
  return el("a", { href, target: "_blank", rel: "noopener noreferrer" }, texto);
}

function seloSituacao(situacao, rotulo) {
  const classe = { vigente_confirmada: "vigente", alterada: "vigente", revogada: "revogada", sem_efeito_judicial: "revogada",
    historica: "historica", nao_verificada: "nao-verificada", orientacao_institucional: "orientacao" }[situacao] || "";
  return el("span", { classe: `selo ${classe}` }, rotulo);
}

function seloConferencia(conferido) {
  return conferido
    ? el("span", { classe: "selo vigente" }, "Texto conferido")
    : el("span", { classe: "selo nao-conferido" }, "Texto NÃO conferido (prévia)");
}

// Copia para a área de transferência. A API moderna só existe em conexão segura (https);
// em outros casos usa o método antigo, que ainda funciona na maioria dos navegadores.
async function copiarTexto(texto, aviso) {
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    const area = el("textarea", { readonly: true, "aria-hidden": "true", style: "position:fixed;left:-9999px;top:0" });
    area.value = texto;
    document.body.append(area);
    area.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
  }
  if (aviso) aviso.textContent = ok ? "Copiado." : "Não foi possível copiar automaticamente; selecione o texto e copie.";
}

// Envia o formulário (requestSubmit não existe em Safari antigo).
function enviarFormulario(form) {
  if (typeof form.requestSubmit === "function") form.requestSubmit();
  else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

// ---------------------------------------------------------------- tema (escuro padrão; claro opcional)
function aplicarTema(tema) {
  const claro = tema === "claro";
  if (claro) document.documentElement.setAttribute("data-tema", "claro");
  else document.documentElement.removeAttribute("data-tema");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", claro ? "#173456" : "#0a0e14");
  const b = $("#botao-tema");
  b.textContent = claro ? "Tema escuro" : "Tema claro";
  b.setAttribute("aria-pressed", String(claro));
  b.setAttribute("aria-label", claro ? "Mudar para o tema escuro" : "Mudar para o tema claro");
  try { localStorage.setItem("gpecss-tema", claro ? "claro" : "escuro"); } catch { /* vale só nesta visita */ }
}

function configurarTema() {
  const atual = document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
  aplicarTema(atual);
  $("#botao-tema").addEventListener("click", () =>
    aplicarTema(document.documentElement.getAttribute("data-tema") === "claro" ? "escuro" : "claro"));
}

// ---------------------------------------------------------------- conexão, instalação e atualização
function configurarConexao() {
  const atualizar = () => { $("#faixa-rede").hidden = navigator.onLine !== false; };
  window.addEventListener("online", atualizar);
  window.addEventListener("offline", atualizar);
  atualizar();
}

let pedidoInstalacao = null;
function configurarInstalacao() {
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    pedidoInstalacao = ev;
    renderizarInstalacao();
  });
  window.addEventListener("appinstalled", () => { pedidoInstalacao = null; renderizarInstalacao(); });
}

function appInstalado() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

function renderizarInstalacao() {
  const alvo = $("#instalar");
  if (!alvo) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (appInstalado()) {
    alvo.replaceChildren(el("p", {}, "A plataforma já está instalada neste aparelho."));
  } else if (pedidoInstalacao) {
    alvo.replaceChildren(el("button", { type: "button", classe: "botao-primario", onclick: async () => {
      pedidoInstalacao.prompt();
      await pedidoInstalacao.userChoice.catch(() => null);
      pedidoInstalacao = null;
      renderizarInstalacao();
    } }, "Instalar como aplicativo"));
  } else if (ios) {
    alvo.replaceChildren(el("p", {}, "No iPhone ou iPad (Safari): toque em Compartilhar e depois em “Adicionar à Tela de Início”."));
  } else {
    alvo.replaceChildren(el("p", {}, "No Chrome ou Edge (computador ou Android): use o ícone de instalar na barra de endereço ou o menu ⋮ › “Instalar app”. No Firefox de computador, adicione aos favoritos."));
  }
}

function registrarServiceWorker() {
  // Funciona em https e em localhost (contextos seguros).
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  let recarregando = false;
  // Só há "versão nova" se a página já era controlada por uma versão anterior. Na
  // primeira visita o service worker se instala e assume sem aviso nem recarga.
  const haviaVersaoAnterior = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregando || !haviaVersaoAnterior) return;
    recarregando = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const oferecer = (sw) => {
      if (!sw || !haviaVersaoAnterior) return; // primeira instalação: nada a avisar
      $("#faixa-atualizacao").hidden = false;
      $("#atualizar").onclick = () => sw.postMessage("PULAR_ESPERA");
    };
    if (reg.waiting) oferecer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const novo = reg.installing;
      novo?.addEventListener("statechange", () => { if (novo.state === "installed") oferecer(novo); });
    });
  }).catch(() => { /* sem service worker: o app funciona normalmente, só não fica offline */ });
}

// Referência ABNT e citação no texto, com botão de copiar (estudantes, docentes, relatórios).
function blocoCitacao(doc, unidade) {
  if (!doc) return null;
  const { referencia, citacao } = referenciaABNT(doc, unidade);
  const aviso = el("span", { classe: "ajuda", "aria-live": "polite" });
  return el("details", { classe: "citacao" },
    el("summary", {}, "Como citar (ABNT)"),
    el("p", {}, el("strong", {}, "Referência: "), referencia),
    el("p", {}, el("strong", {}, "Citação no texto: "), citacao),
    el("div", { classe: "linha-acoes" },
      el("button", { type: "button", classe: "botao", onclick: () => copiarTexto(referencia, aviso) }, "Copiar referência"),
      el("button", { type: "button", classe: "botao", onclick: () => copiarTexto(citacao, aviso) }, "Copiar citação"),
      aviso),
    el("p", { classe: "ajuda" }, "Confira a referência com as normas da sua instituição. Ao citar trecho literal, use aspas e indique o dispositivo."));
}

// ---------------------------------------------------------------- estado
const estado = { acervo: null, indice: null, modo: null, motor: null, semantica: null, interpretacao: null };

function ambienteLocal() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) || location.hostname.endsWith(".localhost");
}

async function carregarAcervo() {
  const params = new URLSearchParams(location.search);
  let modo = CONFIG.acervoPadrao;
  if (params.get("acervo") === "previa" && ambienteLocal()) modo = "previa";
  const arquivo = modo === "previa" ? "dados/acervo-previa.json" : "dados/acervo-publico.json";
  const aviso = $("#carregando");
  aviso.hidden = false;
  aviso.textContent = "Carregando o acervo de normas…";
  // Até 3 tentativas: em redes móveis a primeira pode falhar.
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 3 && !estado.acervo; tentativa++) {
    try {
      const r = await fetch(arquivo, { cache: "no-cache" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const dados = await r.json();
      if (!Array.isArray(dados.documentos) || !Array.isArray(dados.unidades)) throw new Error("arquivo do acervo em formato inesperado");
      estado.acervo = dados;
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < 3) await new Promise((ok) => setTimeout(ok, 800 * tentativa));
    }
  }
  if (!estado.acervo) {
    estado.acervo = { modo, documentos: [], unidades: [], gerado_em: null, erro: String(ultimoErro) };
    aviso.replaceChildren(el("span", { classe: "alerta" },
      "Não foi possível carregar o acervo (verifique a conexão). ",
      el("button", { type: "button", classe: "botao", onclick: () => location.reload() }, "Tentar de novo")));
  } else {
    aviso.hidden = true;
  }
  estado.modo = modo;
  estado.indice = new IndiceLexical(estado.acervo);
  $("#faixa-previa").hidden = modo !== "previa";

  // A análise por IA só é usada se a própria pessoa a tiver ativado (D17).
  const pref = lerPreferenciaIA();
  if (pref.ativo && iaPermitida() && modelosDisponiveis().includes(pref.modelo) && webgpuDisponivel()) {
    estado.motor = new MotorWebLLM(pref.modelo, { aoProgresso: progressoModelo });
  }
  atualizarEstadoIA();
}

// ---------------------------------------------------------------- orientações institucionais (camada 2, D41)
// Índice à parte, carregado depois do acervo de normas: se não carregar, o app funciona
// igual, só sem as orientações.
const NATUREZAS = {
  norma_expressa: "O que a norma estabelece",
  interpretacao: "Interpretação proposta",
  orientacao: "Segundo orientação institucional (não é norma)",
};

async function carregarInterpretacao() {
  const arquivo = estado.modo === "previa" ? "dados/interpretacao-previa.json" : "dados/interpretacao-publico.json";
  try {
    const r = await fetch(arquivo, { cache: "no-cache" });
    if (!r.ok) return;
    const dados = await r.json();
    if (Array.isArray(dados.documentos) && dados.documentos.length) estado.interpretacao = new IndiceLexical(dados);
  } catch { /* sem a camada 2: segue só com as normas */ }
}

function listarOrientacoes() {
  const ind = estado.interpretacao;
  if (!ind) return;
  const docs = [...ind.documentos.values()].sort((a, b) => (b.ano || 0) - (a.ano || 0));
  $("#orientacoes").hidden = false;
  $("#lista-orientacoes").replaceChildren(el("p", { classe: "ajuda" }, `${docs.length} documento(s)`),
    ...docs.map((d) => el("article", { classe: "doc-item" },
      el("h3", {}, d.titulo),
      el("p", { classe: "doc-meta" }, [d.tipo_rotulo, d.orgao, d.ano, d.autoria].filter(Boolean).join(" · ")),
      el("div", { classe: "selos" }, seloSituacao(d.situacao, d.situacao_rotulo), seloConferencia(d.conferido)),
      el("div", { classe: "links-fonte" },
        el("button", { classe: "botao", type: "button", onclick: () => lerDocumento(d.id, ind) }, "Ler os trechos"),
        linkExterno(d.arquivo_url, "PDF original")),
      blocoCitacao(d, null))));
}

// ---------------------------------------------------------------- busca por sentido opcional (D36)
const CHAVE_SENTIDO = "gpecss-busca-sentido";
const CACHE_TRANSFORMERS = "transformers-cache";

function lerPreferenciaSentido() {
  // IA leve ligada por padrão (D43), salvo se a pessoa desligou ou pediu economia de dados.
  try {
    const v = localStorage.getItem(CHAVE_SENTIDO);
    return v ? v === "ativo" : !navigator.connection?.saveData;
  } catch { return true; }
}
function gravarPreferenciaSentido(ativo) {
  try { localStorage.setItem(CHAVE_SENTIDO, ativo ? "ativo" : "inativo"); } catch { /* vale só nesta visita */ }
}

function atualizarEstadoSentido(texto) {
  $("#estado-sentido").textContent = texto ?? (estado.semantica ? "· Busca por sentido ativada" : "");
}

// Prepara índice de vetores e modelo. Só é chamado se a pessoa ativou o recurso.
async function prepararSentido(aoProgresso) {
  const arquivo = estado.modo === "previa" ? "dados/semantica-previa.json" : "dados/semantica-publico.json";
  const r = await fetch(arquivo, { cache: "no-cache" });
  if (!r.ok) throw new Error(`vetores indisponíveis (HTTP ${r.status})`);
  const dados = await r.json();
  if (dados.acervo_gerado_em !== estado.acervo.gerado_em) {
    throw new Error("os vetores de sentido são de outra versão do acervo; aguarde a atualização");
  }
  const indice = new IndiceSemantico(dados);
  const motor = new MotorSemantico(dados.modelo, { aoProgresso });
  await motor.carregar();
  estado.semantica = { indice, motor };
}

async function modeloSentidoBaixado() {
  try {
    if (!("caches" in window)) return false;
    const c = await caches.open(CACHE_TRANSFORMERS);
    return (await c.keys()).some((k) => /multilingual-e5-small/.test(k.url));
  } catch { return false; }
}

async function renderizarPainelSentido() {
  const alvo = $("#conteudo-sentido");
  const interruptor = el("input", { type: "checkbox", id: "ativar-sentido", role: "switch", checked: !!estado.semantica || null });
  const progresso = el("p", { classe: "ajuda", "aria-live": "polite" });
  const barra = el("progress", { max: "1", value: "0", hidden: true });
  const remover = el("button", { type: "button", classe: "botao", hidden: !(await modeloSentidoBaixado()) },
    "Remover o modelo deste navegador");

  interruptor.addEventListener("change", async () => {
    if (!interruptor.checked) {
      estado.semantica = null;
      gravarPreferenciaSentido(false);
      atualizarEstadoSentido();
      progresso.textContent = "Busca por sentido desativada. As consultas usam só a busca por termos.";
      return;
    }
    if (!(await modeloSentidoBaixado()) && !window.confirm(
      `A busca por sentido vai baixar cerca de ${TAMANHO_MODELO_MB} MB para este navegador (uma única vez). ` +
      "Use uma conexão sem limite de dados. Deseja continuar?")) {
      interruptor.checked = false;
      return;
    }
    interruptor.disabled = true;
    barra.hidden = false;
    progresso.textContent = "Preparando a busca por sentido…";
    try {
      await prepararSentido((fracao) => { barra.value = fracao; progresso.textContent = `Baixando o modelo: ${Math.round(fracao * 100)}%`; });
      gravarPreferenciaSentido(true);
      progresso.textContent = "Pronto. As próximas consultas combinam a busca por termos com a busca por sentido.";
      remover.hidden = false;
    } catch (erro) {
      interruptor.checked = false;
      estado.semantica = null;
      gravarPreferenciaSentido(false);
      progresso.textContent = `Não foi possível ativar (${erro.message}). A busca por termos continua funcionando.`;
    } finally {
      interruptor.disabled = false;
      barra.hidden = true;
      atualizarEstadoSentido();
    }
  });
  remover.addEventListener("click", async () => {
    if (!window.confirm("Remover os arquivos do modelo de busca por sentido deste navegador?")) return;
    estado.semantica = null;
    interruptor.checked = false;
    gravarPreferenciaSentido(false);
    try { await caches.delete(CACHE_TRANSFORMERS); } catch { /* nada guardado */ }
    remover.hidden = true;
    progresso.textContent = "Arquivos removidos.";
    atualizarEstadoSentido();
  });

  alvo.replaceChildren(
    el("p", {}, "A busca por termos (sempre ativa) encontra os trechos que usam as palavras da pergunta ou seus sinônimos. ",
      "A busca por sentido, opcional, também encontra trechos que tratam do mesmo assunto com outras palavras — útil para perguntas em linguagem do dia a dia."),
    el("p", {}, "Ela usa um modelo de linguagem pequeno (multilingual-e5-small, licença MIT), que roda ",
      el("strong", {}, "neste dispositivo"), `: a pergunta não sai do navegador. Exige baixar cerca de ${TAMANHO_MODELO_MB} MB uma vez. `,
      "Os trechos mostrados continuam sendo o texto literal das normas; a busca por sentido só ajuda a encontrá-los."),
    el("p", { classe: "ajuda" }, "Recurso experimental: na avaliação do projeto, melhorou pouco as perguntas escritas com termos das normas e ajudou mais nas escritas com outras palavras."),
    el("div", { classe: "linha-acoes" },
      el("label", { classe: "interruptor", for: "ativar-sentido" }, interruptor, " Usar busca por sentido nas minhas consultas"),
      remover),
    barra, progresso);
}

// ---------------------------------------------------------------- IA opcional (D17)
const CHAVE_PREFERENCIA = "gpecss-preferencia-ia";

function iaPermitida() {
  return CONFIG.llm.permitirAtivacao || ambienteLocal();
}

function modelosDisponiveis() {
  return CONFIG.llm.permitirAtivacao ? CONFIG.llm.modelos : CONFIG.llm.modelosTesteLocal;
}

// Guarda apenas "ligado/desligado" e o modelo escolhido — nunca perguntas.
function lerPreferenciaIA() {
  try {
    return { ativo: false, modelo: modelosDisponiveis()[0], ...JSON.parse(localStorage.getItem(CHAVE_PREFERENCIA) || "{}") };
  } catch {
    return { ativo: false, modelo: modelosDisponiveis()[0] };
  }
}

function gravarPreferenciaIA(pref) {
  try {
    localStorage.setItem(CHAVE_PREFERENCIA, JSON.stringify({ ativo: !!pref.ativo, modelo: pref.modelo }));
  } catch {
    // armazenamento indisponível: a escolha vale só nesta visita
  }
}

function atualizarEstadoIA() {
  const alvo = $("#estado-ia");
  if (!estado.motor) {
    alvo.textContent = "PraxIA: encontra e classifica as normas que se aplicam à sua pergunta";
  } else {
    alvo.textContent = `Análise por IA ativada neste dispositivo (${MODELOS[estado.motor.modelo].rotulo})` +
      (CONFIG.llm.permitirAtivacao ? "" : " — TESTE LOCAL");
  }
}

function progressoModelo(texto, fracao) {
  const alvo = $("#progresso-ia") || $("#progresso");
  alvo.textContent = `Preparando o modelo neste dispositivo: ${texto}`;
  const barra = $("#barra-ia");
  if (barra && typeof fracao === "number") barra.value = fracao;
}

function marcador(ok) {
  if (ok === true) return el("span", { classe: "marcador ok", "aria-label": "atende" }, "✓");
  if (ok === false) return el("span", { classe: "marcador falha", "aria-label": "não atende" }, "✗");
  return el("span", { classe: "marcador duvida", "aria-label": "não foi possível confirmar" }, "?");
}

async function renderizarPainelIA() {
  const alvo = $("#conteudo-ia");
  const pref = lerPreferenciaIA();
  const intro = [
    el("p", {}, "O modo documental — que apresenta os trechos comprobatórios na íntegra, com o texto literal dos documentos — está sempre ativo e funciona em qualquer aparelho."),
    el("p", {}, "Opcionalmente, você pode ativar uma análise interpretativa gerada por inteligência artificial que roda ",
      el("strong", {}, "inteiramente neste dispositivo"),
      ": sua pergunta não é enviada a servidores. Em troca, o modelo precisa ser baixado (alguns gigabytes), ocupa espaço no navegador e exige computador com placa de vídeo compatível. Verifique abaixo se o seu aparelho atende."),
  ];
  if (!iaPermitida()) {
    alvo.replaceChildren(...intro, el("p", { classe: "alerta" },
      "A análise por IA ainda está em avaliação e será liberada somente após revisão por profissionais. Por enquanto, use o modo documental."));
    return;
  }
  const opcoes = modelosDisponiveis();
  const seletor = el("select", { id: "modelo-ia", "aria-describedby": "aval-modelo" },
    opcoes.map((id) => el("option", { value: id, selected: id === pref.modelo || null }, `${MODELOS[id].rotulo} — ${gb(MODELOS[id].downloadMB)}`)));
  const avalModelo = el("p", { id: "aval-modelo", classe: "ajuda" });
  const diagnostico = el("ul", { classe: "lista-diagnostico", "aria-live": "polite" });
  const interruptor = el("input", { type: "checkbox", id: "ativar-ia", role: "switch", checked: !!estado.motor || null });
  const remover = el("button", { type: "button", classe: "botao", hidden: true }, "Remover modelo deste navegador");
  const progresso = el("p", { id: "progresso-ia", classe: "ajuda", "aria-live": "polite" });
  const barra = el("progress", { id: "barra-ia", max: "1", value: "0", hidden: true });

  async function diagnosticar() {
    const id = seletor.value;
    avalModelo.textContent = `Licença ${MODELOS[id].licenca}. Situação na avaliação do projeto: ${MODELOS[id].avaliacao}.`;
    diagnostico.replaceChildren(el("li", {}, "Verificando o dispositivo…"));
    const [disp, webllm] = await Promise.all([coletarDispositivo(), carregarBiblioteca().catch(() => null)]);
    const baixado = webllm ? await modeloBaixado(id, webllm) : false;
    const a = avaliarModelo(id, disp, { jaBaixado: baixado });
    const titulo = { apto: "Seu dispositivo parece atender aos requisitos.",
      incerto: "Seu dispositivo pode funcionar, mas há pontos que não foi possível confirmar.",
      inapto: "Seu dispositivo provavelmente não consegue executar este modelo." }[a.situacao];
    diagnostico.replaceChildren(el("li", {}, el("strong", {}, titulo)),
      ...a.itens.map((i) => el("li", {}, marcador(i.ok), " ", i.texto)));
    remover.hidden = !baixado;
    remover.textContent = `Remover modelo deste navegador (libera cerca de ${gb(MODELOS[id].downloadMB)})`;
    interruptor.disabled = a.situacao === "inapto" && !baixado;
    return { baixado, avaliacao: a };
  }

  async function aoAlternar() {
    const id = seletor.value;
    if (!interruptor.checked) {
      await estado.motor?.descarregar();
      estado.motor = null;
      gravarPreferenciaIA({ ativo: false, modelo: id });
      progresso.textContent = "Análise por IA desativada. Os arquivos baixados continuam no navegador até você removê-los.";
      atualizarEstadoIA();
      return;
    }
    const { baixado } = await diagnosticar();
    if (!baixado) {
      const ok = window.confirm(`Ativar a análise por IA vai baixar cerca de ${gb(MODELOS[id].downloadMB)} para este navegador ` +
        "(uma única vez). Use uma conexão sem limite de dados. Deseja continuar?");
      if (!ok) { interruptor.checked = false; return; }
    }
    interruptor.disabled = true;
    seletor.disabled = true;
    barra.hidden = false;
    const motor = new MotorWebLLM(id, { aoProgresso: progressoModelo });
    try {
      await motor.carregar();
      estado.motor = motor;
      gravarPreferenciaIA({ ativo: true, modelo: id });
      progresso.textContent = "Modelo pronto. As próximas consultas incluirão a análise por IA, verificada contra os trechos citados.";
    } catch (erro) {
      interruptor.checked = false;
      estado.motor = null;
      gravarPreferenciaIA({ ativo: false, modelo: id });
      progresso.textContent = `Não foi possível preparar o modelo neste dispositivo (${erro.message}). O modo documental continua disponível.`;
    } finally {
      interruptor.disabled = false;
      seletor.disabled = false;
      barra.hidden = true;
      atualizarEstadoIA();
      diagnosticar();
    }
  }

  seletor.addEventListener("change", async () => {
    if (estado.motor && estado.motor.modelo !== seletor.value) {
      await estado.motor.descarregar();
      estado.motor = null;
      interruptor.checked = false;
      gravarPreferenciaIA({ ativo: false, modelo: seletor.value });
      atualizarEstadoIA();
    }
    diagnosticar();
  });
  interruptor.addEventListener("change", aoAlternar);
  remover.addEventListener("click", async () => {
    const id = seletor.value;
    if (!window.confirm(`Remover os arquivos do modelo ${MODELOS[id].rotulo} deste navegador?`)) return;
    if (estado.motor?.modelo === id) {
      await estado.motor.descarregar();
      estado.motor = null;
      interruptor.checked = false;
      gravarPreferenciaIA({ ativo: false, modelo: id });
      atualizarEstadoIA();
    }
    await removerModelo(id, await carregarBiblioteca());
    progresso.textContent = "Arquivos do modelo removidos deste navegador.";
    diagnosticar();
  });

  alvo.replaceChildren(...intro,
    CONFIG.llm.permitirAtivacao ? null : el("p", { classe: "alerta" },
      "Teste local: a análise por IA ainda não foi liberada na versão pública (aguarda revisão profissional)."),
    el("div", { classe: "campo" }, el("label", { for: "modelo-ia" }, "Modelo"), seletor, avalModelo),
    el("h3", {}, "Diagnóstico deste dispositivo"), diagnostico,
    el("div", { classe: "linha-acoes" },
      el("label", { classe: "interruptor", for: "ativar-ia" }, interruptor, " Usar análise por IA nas minhas consultas"),
      remover),
    barra, progresso,
    el("p", { classe: "ajuda" }, "Você pode desativar a qualquer momento. Desativar libera a memória de vídeo; remover o modelo libera o espaço em disco."));
  diagnosticar();
}

// ---------------------------------------------------------------- consulta
// ---------------------------------------------------------------- seletor de intenções (experimental)
// Usa só as 250 perguntas canônicas (window.PRAXIA_INTENTS); as 177 variantes pendentes ficam desativadas.
// Confirmar uma sugestão apenas refaz a MESMA busca documental com a pergunta canônica: nenhum vínculo
// ou fundamento é transferido e nenhuma resposta pronta é exibida.
const seletor = { origem: null };
function sugestoesIntencao(pergunta) {
  if (!CONFIG.seletorIntencoes || !window.PraxiaSelector || !window.PRAXIA_INTENTS) return [];
  const r = CONFIG.seletorModo === "C" && window.PraxiaSelectorContexto
    ? window.PraxiaSelectorContexto.sugerir(window.PraxiaSelector, window.PRAXIA_INTENTS, window.PRAXIA_VARIANTS, pergunta)
    : window.PraxiaSelector.suggest(pergunta, window.PRAXIA_INTENTS, window.PRAXIA_VARIANTS,
      { threshold: 0.25, limit: 3, useUnreviewedVariants: false });
  const vistos = new Set();
  const canon = r.filter((s) => !vistos.has(s.id) && vistos.add(s.id)).slice(0, 3);
  // D45: perguntas do banco consolidado V1–V10 (NÃO revisadas) completam as vagas, com limiar mais
  // alto (0,40: nenhuma sugestão em perguntas fora do escopo nos casos de validação) e marcadas.
  if (!candidatasAtivas() || !window.PRAXIA_CANDIDATAS || canon.length >= 3) return canon;
  if (!seletor.baseCandidatas) {
    seletor.baseCandidatas = window.PRAXIA_CANDIDATAS.map((x) => ({ ...x, q_orig: x.q, q: window.PraxiaSelectorContexto.norm(window.PraxiaSelector.clean, x.q) }));
  }
  const textos = new Set(canon.map((s) => s.q.trim().toLowerCase()));
  const extra = window.PraxiaSelector.suggest(window.PraxiaSelectorContexto.norm(window.PraxiaSelector.clean, pergunta),
    seletor.baseCandidatas, [], { threshold: 0.4, limit: 3 })
    .map((s) => ({ ...s, q: s.q_orig, naoRevisada: true })).filter((s) => !textos.has(s.q.trim().toLowerCase()));
  return [...canon, ...extra].slice(0, 3);
}

// Candidatas só em teste local enquanto não houver autorização para publicar (CONFIG.seletorCandidatas).
function candidatasAtivas() {
  return CONFIG.seletorCandidatas === true || (CONFIG.seletorCandidatas === "local" && ambienteLocal());
}
function carregarCandidatas() {
  if (!candidatasAtivas() || window.PRAXIA_CANDIDATAS || document.querySelector("script[data-candidatas]")) return;
  document.head.append(el("script", { src: "js/seletor/candidatas.js", "data-candidatas": "1" }));
}

// ---------------------------------------------------------------- conversa (D50)
// Tela de assistente: histórico de perguntas e respostas nesta aba (nada é gravado). Cada resposta
// traz a explicação da IA (se ativada) e, embaixo, só as fontes usadas, com o trecho literal e o
// link do documento original.
const conversa = { n: 0 };

async function aoConsultar(ev) {
  ev.preventDefault();
  const pergunta = $("#pergunta").value.trim();
  const area = $("#conversa");
  const avisar = (texto) => {
    area.append(el("div", { classe: "msg-praxia" }, el("p", { classe: "ajuda" }, texto)));
    area.lastElementChild.scrollIntoView({ block: "end", behavior: "smooth" });
  };
  if (pergunta.length < 8) { $("#pergunta").focus(); return avisar("Escreva a dúvida com um pouco mais de palavras."); }
  if (!estado.indice) return avisar("O acervo ainda está carregando. Tente de novo em alguns segundos.");
  if (!estado.acervo.unidades.length) return avisar("O acervo não foi carregado. Verifique a conexão e recarregue a página.");
  const botao = $("#consultar");
  botao.disabled = true;
  estado.ultimaPergunta = pergunta;
  $("#boas-vindas").hidden = true;
  $("#nova-conversa").hidden = false;
  area.append(el("div", { classe: "balao-usuario" }, pergunta));
  const msg = el("div", { classe: "msg-praxia" }, el("p", { classe: "pensando" }, "Procurando nos documentos oficiais…"));
  area.append(msg);
  msg.scrollIntoView({ block: "start", behavior: "smooth" });
  $("#pergunta").value = "";
  ajustarAltura();
  const lista = el("ol");
  $("#progresso").replaceChildren(el("p", {}, "Etapas da análise:"), lista);
  try {
    const r = await consultar(estado.indice, pergunta, {
      semantica: estado.semantica,
      interpretacao: estado.interpretacao,
      aoProgresso: (nome, detalhe) => lista.append(el("li", {}, `${nome}: ${detalhe}`)),
    });
    if (ambienteLocal()) window.ultimasEtapas = r.etapas; // diagnóstico em teste local
    renderizarMensagem(msg, r, pergunta);
  } catch (erro) {
    msg.replaceChildren(el("p", { classe: "alerta" }, `Não foi possível concluir a consulta: ${erro.message}`));
  } finally {
    botao.disabled = false;
    $("#pergunta").focus();
  }
}

function ajustarAltura() {
  const t = $("#pergunta");
  t.style.height = "auto";
  t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
}

function novaConversa() {
  $("#conversa").replaceChildren();
  $("#boas-vindas").hidden = false;
  $("#nova-conversa").hidden = true;
  $("#pergunta").focus();
}

function abrirFonte(pref, id) {
  const alvo = document.getElementById(`${pref}-${id}`);
  if (!alvo) return;
  const trecho = alvo.querySelector(".fonte-trecho");
  if (trecho) { trecho.hidden = false; alvo.querySelector(".ver-trecho")?.setAttribute("aria-expanded", "true"); }
  document.querySelectorAll(".fonte.destacada").forEach((x) => x.classList.remove("destacada"));
  alvo.classList.add("destacada");
  alvo.scrollIntoView({ block: "center", behavior: "smooth" });
}

function itemFonte(pref, e) {
  const revogada = e.situacaoDispositivo || ["revogada", "suspensa"].includes(e.documento.situacao);
  const trecho = el("div", { classe: "fonte-trecho", hidden: true },
    e.contexto?.length ? e.contexto.map((c) => el("p", { classe: "contexto" }, c.texto)) : null,
    el("blockquote", { classe: "trecho", cite: e.link }, e.texto),
    revogada ? el("p", { classe: "alerta" }, "Atenção à vigência: ", e.notaDispositivo || e.documento.situacaoRotulo || "") : null,
    e.documento.fonteOficial ? el("p", {}, linkExterno(e.documento.fonteOficial, "Página oficial do documento")) : null);
  const ver = el("button", { type: "button", classe: "link-botao ver-trecho", "aria-expanded": "false", onclick: () => {
    trecho.hidden = !trecho.hidden; ver.setAttribute("aria-expanded", String(!trecho.hidden));
  } }, "Ver trecho");
  return el("li", { classe: "fonte", id: `${pref}-${e.id}` },
    el("div", { classe: "fonte-cab" },
      el("span", { classe: "fonte-id" }, e.id),
      el("span", { classe: "fonte-titulo" }, tituloFonte(e)),
      el("span", { classe: "fonte-local" }, ` · ${localDe(e)} · ${categoriaDe(e.documento, e.parte).rotulo}`)),
    el("div", { classe: "fonte-acoes" }, ver, linkExterno(e.link || e.documento.fonteOficial, "Abrir documento oficial")),
    trecho);
}

// D52: todos os documentos relacionados, por tipo; revogados só como contexto histórico.
function itemPanorama(it) {
  const nome = categoriaDe(it.documento, it.parte).id === "lei" && it.parte ? it.parte : it.documento.titulo;
  const trecho = el("blockquote", { classe: "trecho", hidden: true }, it.texto);
  const ver = el("button", { type: "button", classe: "link-botao", "aria-expanded": "false", onclick: () => {
    trecho.hidden = !trecho.hidden; ver.setAttribute("aria-expanded", String(!trecho.hidden));
  } }, "Ver trecho");
  return el("li", { classe: "panorama-item" },
    el("span", { classe: "fonte-titulo" }, nome),
    el("span", { classe: "fonte-local" }, ` · ${it.documento.orgao || ""}${it.origem !== "trata do tema" ? ` · ${it.origem}` : ""}`),
    it.documento.situacao === "alterada" ? el("span", { classe: "selo" }, " alterada: confira a redação vigente") : null,
    el("div", { classe: "fonte-acoes" }, ver, linkExterno(it.link || it.documento.fonteOficial, "Abrir documento oficial")),
    trecho);
}
function blocoPanorama(pan) {
  const cats = pan.categorias.map((g) => el("div", { classe: "panorama-grupo" },
    el("p", { classe: "panorama-cat" }, `${g.categoria.rotulo} (${g.documentos.length + g.omitidos})`),
    el("p", { classe: "ajuda" }, g.categoria.descricao),
    el("ul", {}, g.documentos.map(itemPanorama)),
    g.omitidos ? el("p", { classe: "ajuda" }, `Mais ${g.omitidos} documento(s) com menor relação com a pergunta.`) : null));
  const hist = pan.historico.length ? el("details", { classe: "panorama-historico" },
    el("summary", {}, `Contexto histórico: ${pan.historico.length} norma(s) revogada(s) ou suspensa(s)`),
    el("p", { classe: "ajuda" }, "Não estão em vigor. Servem só para entender a história do tema ou fatos da época em que valiam."),
    el("ul", {}, pan.historico.map(itemPanorama))) : null;
  return el("details", { classe: "panorama" },
    el("summary", {}, `Todos os documentos em vigor relacionados (${pan.total}), por tipo`),
    ...cats,
    pan.semResultado.length ? el("p", { classe: "ajuda" }, `Sem documento relacionado no acervo: ${pan.semResultado.join(", ")}.`) : null,
    hist);
}

// D53: dois modos. Biblioteca entrega os documentos (sem IA); Trilhas pede à IA uma reflexão
// fundamentada em toda a literatura encontrada, sempre com os limites da ferramenta.
const CHAVE_MODO = "praxia-modo";
const AJUDA_MODO = {
  biblioteca: "Biblioteca: os documentos oficiais ligados à sua pergunta.",
  trilhas: "Trilhas e Reflexões: uma reflexão da IA a partir de toda a literatura encontrada. Não substitui os Conselhos nem o seu julgamento profissional.",
  bussola: "Bússola Institucional: quem pode lidar com a sua situação — o que cabe ao CRESS, ao CFESS, às comissões e a outras instituições, e o que o CRESS pode fazer por você.",
  violacao: "Possível violação: o que as normas dizem sobre a situação e como acionar a fiscalização do CRESS do seu território.",
};
function modoAtual() { try { return ["trilhas", "bussola", "violacao"].includes(localStorage.getItem(CHAVE_MODO)) ? localStorage.getItem(CHAVE_MODO) : "biblioteca"; } catch { return "biblioteca"; } }
const NOMES_MODO = { biblioteca: "Biblioteca", trilhas: "Trilhas e Reflexões", bussola: "Bússola Institucional", violacao: "Possível violação" };
let modoSelecionado = "biblioteca";
function aplicarModo(modo) {
  modoSelecionado = NOMES_MODO[modo] ? modo : "biblioteca";
  try { localStorage.setItem(CHAVE_MODO, modoSelecionado); } catch { /* sem armazenamento: vale só nesta página */ }
  const nome = document.getElementById("nome-modo"); if (nome) nome.textContent = NOMES_MODO[modoSelecionado];
  document.querySelectorAll("#menu-modo [data-modo]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.modo === modoSelecionado)));
  const p = document.getElementById("pergunta");
  if (p) p.placeholder = { biblioteca: "Pergunte à PraxIA…", trilhas: "Conte a situação para refletir…", bussola: "Conte a situação: quem pode ajudar?", violacao: "Conte a situação e o estado onde você trabalha…" }[modoSelecionado];
}
function configurarModo() {
  const botao = document.getElementById("botao-modo");
  const menu = document.getElementById("menu-modo");
  if (!botao || !menu) return;
  const fechar = () => { menu.hidden = true; botao.setAttribute("aria-expanded", "false"); };
  botao.addEventListener("click", (ev) => {
    ev.stopPropagation();
    menu.hidden = !menu.hidden; botao.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('[aria-checked="true"]')?.focus();
  });
  menu.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => { aplicarModo(b.dataset.modo); fechar(); botao.focus(); }));
  menu.addEventListener("keydown", (ev) => {
    const itens = [...menu.querySelectorAll("[data-modo]")];
    const i = itens.indexOf(document.activeElement);
    if (ev.key === "Escape") { fechar(); botao.focus(); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); itens[(i + 1) % itens.length].focus(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
  });
  document.addEventListener("click", (ev) => { if (!menu.hidden && !menu.contains(ev.target)) fechar(); });
  aplicarModo(modoAtual());
}
function modoEscolhido() { return modoSelecionado; }

function renderizarMensagem(msg, r, pergunta) {
  const pref = `m${++conversa.n}`;
  const fund = r.secoes.find((s) => s.id === "fundamentacao");
  const ori = r.secoes.find((s) => s.id === "orientacoes");
  const modo = modoEscolhido();
  const panRes = r.secoes.find((s) => s.id === "panorama")?.panorama;
  const fontes = (modo === "bussola" || modo === "violacao") && estado.indice
    ? fontesBussola(estado.indice, estado.interpretacao, r.pergunta, fund?.evidencias || [])
    : modo === "trilhas"
    ? fontesTrilhas(fund?.evidencias || [], ori?.orientacoes || [], panRes)
    : escolherFontes(fund?.evidencias || [], ori?.orientacoes || []);
  const corpo = el("div", { classe: "msg-texto" });
  const blocoFontes = el("div", { classe: "fontes" });
  const extras = el("div", { classe: "msg-extras" });
  msg.replaceChildren(corpo, blocoFontes, extras);

  if (!fontes.length) {
    corpo.append(el("p", {}, "Não encontrei, nos documentos oficiais da PraxIA, um trecho que trate diretamente disso. " +
      "Tente escrever de outro jeito ou procure o CRESS da sua região."));
    if (modo === "violacao") msg.append(cartaoFiscalizacao(pergunta));
    return;
  }
  const mostrarFontes = (citadas) => {
    const lista = citadas?.length ? citadas.map((id) => fontes.find((f) => f.id === id)).filter(Boolean) : fontes;
    blocoFontes.replaceChildren(el("p", { classe: "fontes-titulo" }, "Fontes"),
      el("ol", { classe: "lista-fontes" }, lista.map((e) => itemFonte(pref, e))));
  };
  const semIA = (texto) => { corpo.replaceChildren(el("p", {}, texto)); mostrarFontes(null); };
  const ids = new Set(fontes.map((f) => f.id));
  const cfg = CONFIG.chat;

  const pan = r.secoes.find((s) => s.id === "panorama")?.panorama;
  if (pan) { const b = blocoPanorama(pan); if (modo === "biblioteca") b.open = true; extras.append(b); }
  const fiscal = modo === "violacao" ? cartaoFiscalizacao(pergunta) : null;
  if (fiscal) msg.insertBefore(fiscal, blocoFontes);

  // Perguntas parecidas (seletor): discretas, no fim da resposta.
  const parecidas = sugestoesIntencao(pergunta).filter((s) => s.q.trim().toLowerCase() !== pergunta.trim().toLowerCase());
  if (parecidas.length) {
    extras.append(el("p", { classe: "parecidas-titulo" }, "Perguntas parecidas"), el("div", { classe: "parecidas" },
      parecidas.map((s) => el("button", { type: "button", classe: "exemplo", onclick: () => { $("#pergunta").value = s.q; enviarFormulario($("#form-consulta")); } },
        s.q, s.naoRevisada ? el("span", { classe: "selo nao-conferido" }, "não revisada") : null))));
  }

  const pedir = async () => {
    const s = situacaoLimite(cfg);
    if (!s.pode) return semIA(`${s.motivo} Enquanto isso, estes são os documentos oficiais mais próximos da sua pergunta:`);
    corpo.replaceChildren(el("p", { classe: "pensando" }, modo === "violacao" ? "Lendo o que as normas dizem sobre essa situação…" : modo === "bussola" ? "Procurando quem pode lidar com essa situação…" : modo === "trilhas"
      ? `Lendo ${fontes.length} trechos da literatura encontrada…` : "Lendo os trechos oficiais encontrados…"));
    blocoFontes.replaceChildren();
    const resp = await pedirExplicacao(cfg, r.pergunta, fontes.map(paraTrecho), modo);
    if (resp.erro) return semIA(`${resp.erro} Estes são os documentos oficiais mais próximos da sua pergunta:`);
    corpo.replaceChildren(
      ...partesDoTexto(conferirFrases(resp.texto, new Map(fontes.map((f) => [f.id, f.texto]))), ids).map((par) => el("p", {}, ...par.map((p) => (p.tipo === "ref"
        ? el("button", { type: "button", classe: "ref", "aria-label": `ver fonte ${p.valor}`, onclick: () => abrirFonte(pref, p.valor) }, p.valor)
        : p.tipo === "aviso" ? el("span", { classe: "aviso-frase", title: "A PraxIA não encontrou, nos trechos citados, apoio claro para esta frase." }, `⚠ ${p.valor}`)
        : p.valor)))),
      el("p", { classe: "nota-ia" }, modo === "violacao"
        ? "Leitura automática (modo Possível violação), não conferida. Não é decisão sobre o caso: quem avalia é a fiscalização do CRESS."
        : modo === "bussola"
        ? "Orientação automática (modo Bússola Institucional), não conferida. As instituições externas são informação geral: confirme com cada órgão. Não substitui o atendimento do CRESS da sua região."
        : modo === "trilhas"
        ? "Reflexão automática (modo Trilhas e Reflexões), não conferida. Não substitui o CFESS, os CRESS, as demais entidades nem o julgamento profissional. Confira as fontes abaixo."
        : "Resposta automática, não conferida. Confira as fontes abaixo."));
    mostrarFontes(idsCitados(resp.texto, ids));
  };

  const bloqueio = bloqueioPrivacidade(pergunta);
  if (modo === "biblioteca") return semIA("Modo Biblioteca: estes são os documentos oficiais ligados à sua pergunta. Abra o trecho ou o documento original para conferir. Para uma reflexão a partir deles, mude para o modo Trilhas e Reflexões; para saber quem pode lidar com a situação, use o modo Bússola Institucional.");
  if (!chatAtivo()) return semIA("Estes são os documentos oficiais mais próximos da sua pergunta. Abra o trecho ou o documento original para conferir.");
  if (bloqueio) return semIA(`${bloqueio} Mesmo assim, estes são os documentos oficiais mais próximos:`);
  if (consentiu()) return pedir();
  corpo.append(
    el("p", {}, modo === "violacao"
      ? `Encontrei ${fontes.length} trechos de normas ligados a essa situação. Quer que a IA explique o que pode estar em jogo?`
      : modo === "bussola"
      ? `Encontrei ${fontes.length} trechos sobre competências do Conjunto CFESS-CRESS ligados a isso. Quer que a IA explique quem pode lidar com essa situação?`
      : `Encontrei ${fontes.length} trechos da literatura oficial sobre isso. Quer que a IA escreva uma reflexão cautelosa a partir deles?`),
    el("p", { classe: "ajuda" }, "Para explicar, a pergunta e os trechos encontrados vão ao Gemini, do Google (nível gratuito, em que o Google pode usar o conteúdo). ",
      "Nunca escreva dados sensíveis. ", el("button", { type: "button", classe: "link-botao", onclick: () => $("#aba-sobre-ia").click() }, "Saiba mais")),
    el("div", { classe: "linha-acoes" },
      el("button", { type: "button", classe: "botao-primario", onclick: () => { definirConsentimento(true); pedir(); } }, modo === "violacao" ? "Sim, explicar" : modo === "bussola" ? "Sim, orientar" : "Sim, refletir"),
      el("button", { type: "button", classe: "botao", onclick: () => semIA("Tudo bem. Estes são os documentos oficiais mais próximos da sua pergunta:") }, "Só os documentos")));
  mostrarFontes(null);
}

// D59: cartão fixo do modo Possível violação (sem IA; aparece sempre).
function cartaoFiscalizacao(pergunta) {
  const f = recomendacaoFiscalizacao(pergunta);
  return el("aside", { classe: "cartao-fiscal", role: "note" },
    el("p", { classe: "cartao-fiscal-titulo" }, f.titulo),
    el("p", {}, f.texto),
    el("p", {}, f.comoAchar),
    f.cress.length ? el("p", {}, ...f.cress.flatMap((c, i) => [i ? " · " : "",
      el("a", { href: c.busca, target: "_blank", rel: "noopener noreferrer" }, `Buscar contato da fiscalização do ${c.sigla}`)])) : null,
    f.semUF ? el("p", { classe: "ajuda" }, "Dica: diga o estado onde você trabalha (por exemplo, \"trabalho em Minas Gerais\") para a PraxIA indicar o CRESS certo.") : null);
}

// Consentimento dado uma vez neste navegador (pode ser retirado na aba "Sobre a IA").
const CHAVE_CONSENTIMENTO = "praxia-chat-consentimento-v1";
function consentiu() { try { return localStorage.getItem(CHAVE_CONSENTIMENTO) === "sim"; } catch { return false; } }
function definirConsentimento(sim) {
  try { sim ? localStorage.setItem(CHAVE_CONSENTIMENTO, "sim") : localStorage.removeItem(CHAVE_CONSENTIMENTO); } catch { /* sem armazenamento */ }
  atualizarEstadoChat();
}
function atualizarEstadoChat() {
  const alvo = $("#estado-chat");
  if (!alvo) return;
  if (!chatAtivo()) { alvo.replaceChildren(); return; }
  alvo.replaceChildren(consentiu()
    ? el("span", {}, "Explicação pela IA: ativada neste navegador. ", el("button", { type: "button", classe: "link-botao", onclick: () => definirConsentimento(false) }, "Desativar"))
    : el("span", {}, "Explicação pela IA: desativada neste navegador. Ela é oferecida na próxima pergunta."));
}

function botaoRef(id) {
  return el("a", { classe: "ref", href: `#ev-${id}`, "aria-label": `ver evidência ${id}`,
    onclick: () => destacar(id) }, id);
}

function destacar(id) {
  document.querySelectorAll(".evidencia.destacada").forEach((x) => x.classList.remove("destacada"));
  const alvo = document.getElementById(`ev-${id}`);
  if (!alvo) return;
  for (let d = alvo.closest("details"); d; d = d.parentElement?.closest("details")) d.open = true;
  alvo.classList.add("destacada");
  setTimeout(() => alvo.scrollIntoView({ block: "center", behavior: "smooth" }), 0);
}

// "Resolução nº 1.114/2025 · CFESS" (ou "Código de Ética · CFESS · 1993" quando não há número).
function identificacao(d) {
  if (d.numero && d.ano) return `${d.tipo} nº ${Number(d.numero).toLocaleString("pt-BR")}/${d.ano} · ${d.orgao}`;
  return `${d.tipo} · ${d.orgao}${d.ano ? ` · ${d.ano}` : ""}`;
}

function cartaoEvidencia(e, afirmacoesQueCitam) {
  const d = e.documento;
  const cab = el("div", { classe: "evidencia-cabecalho" },
    el("div", {}, el("span", { classe: "evidencia-id" }, e.id), el("span", { classe: "evidencia-doc" }, d.titulo)),
    el("div", { classe: "selos" },
      e.prioridade ? el("span", { classe: `selo prioridade ${e.prioridade}`, title: motivoPrioridade(e) || "" }, PRIORIDADES[e.prioridade]) : null,
      seloSituacao(d.situacao, d.situacaoRotulo), seloConferencia(d.conferido)));
  const contexto = e.contexto.map((c) => el("p", { classe: "contexto" },
    c.texto.startsWith(c.rotulo.split(",").pop().trim().split(" ")[0]) ? null : el("strong", {}, `${c.rotulo}: `), c.texto));
  let relacao;
  if (afirmacoesQueCitam?.length) {
    relacao = el("div", { classe: "relacao" }, el("strong", {}, "Relação com a análise: "),
      "fundamenta ", afirmacoesQueCitam.map((n) => `a afirmação ${n}`).join(", "), ".");
  } else {
    relacao = el("p", { classe: "relacao" }, el("strong", {}, "Relação com a pergunta: "),
      e.termosCasados.length
        ? `selecionado por conter termos da pergunta (${[...new Set(e.termosCasados)].slice(0, 8).join(", ")})${e.porSinonimo ? " e termos relacionados" : ""}. `
        : e.porSentido
          ? "selecionado pela busca por sentido (trata de assunto próximo ao da pergunta, com outras palavras). "
          : "selecionado por termos relacionados aos da pergunta. ",
      "A pertinência ao caso deve ser avaliada na leitura.");
  }
  return el("article", { classe: "evidencia", id: `ev-${e.id}` },
    cab,
    el("p", { classe: "evidencia-local" }, `${identificacao(d)} — ${e.localizacao}`),
    contexto,
    e.situacaoDispositivo
      ? el("p", { classe: "alerta" }, el("strong", {},
        { revogado: "Dispositivo revogado. ", alterado: "Redação alterada. ", vigente_com_ressalva: "Atenção à vigência. " }[e.situacaoDispositivo]),
      e.notaDispositivo)
      : null,
    el("blockquote", { classe: "trecho", cite: e.link }, e.texto),
    relacao,
    (() => {
      const avisos = e.vigencia.avisos.filter((a) => !a.startsWith("Este dispositivo:"));
      return avisos.length ? el("p", { classe: "relacao" }, el("strong", {}, "Vigência: "), avisos.join(" ")) : null;
    })(),
    el("div", { classe: "links-fonte" },
      linkExterno(e.link, `Abrir o PDF original na p. ${e.pagina}`),
      linkExterno(d.fonteOficial, "Página oficial do documento")),
    e.camada === 2
      ? blocoCitacao(estado.interpretacao?.documentos.get(d.id), estado.interpretacao?.porId.get(e.unidadeId))
      : blocoCitacao(estado.indice.documentos.get(d.id), estado.indice.porId.get(e.unidadeId)));
}

// ---------------------------------------------------------------- chat gratuito (D44/D46)
function chatAtivo() {
  const a = CONFIG.chat?.ativo;
  return a === true || (a === "local" && ambienteLocal());
}

const AVISO_CHAT = "Não escreva, por hipótese alguma, dados sensíveis: nomes, documentos, números de processo, " +
  "dados de saúde ou qualquer informação que identifique pessoas ou situações atendidas.";
const RESSALVA_CHAT = "As respostas do chat não substituem, de nenhuma maneira, as respostas diretas do CFESS, " +
  "dos CRESS e das demais instituições representativas da categoria.";

// ---------------------------------------------------------------- biblioteca
function preencherFiltros() {
  const docs = estado.acervo.documentos;
  const opcoes = (sel, valores) => {
    for (const [v, rot] of valores) $(sel).append(el("option", { value: v }, rot));
  };
  const unicos = (f) => [...new Map(docs.map((d) => [f(d)[0], f(d)])).values()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  opcoes("#f-tema", unicos((d) => [d.assunto_principal, ASSUNTOS_ROTULOS[d.assunto_principal] || d.assunto_principal])
    .filter(([v]) => v));
  opcoes("#f-tipo", unicos((d) => [d.tipo, d.tipo_rotulo]));
  opcoes("#f-orgao", unicos((d) => [d.orgao, d.orgao]));
  opcoes("#f-situacao", unicos((d) => [d.situacao, d.situacao_rotulo]));
  opcoes("#f-ano", unicos((d) => [String(d.ano ?? ""), d.ano ?? "sem ano"]).filter(([v]) => v));
  for (const id of ["#f-texto", "#f-tema", "#f-tipo", "#f-orgao", "#f-situacao", "#f-ano"]) $(id).addEventListener("input", listarDocumentos);
}

function listarDocumentos() {
  const txt = dobrarAcentos($("#f-texto").value.trim().toLowerCase());
  const f = { tema: $("#f-tema").value, tipo: $("#f-tipo").value, orgao: $("#f-orgao").value, situacao: $("#f-situacao").value, ano: $("#f-ano").value };
  const docs = estado.acervo.documentos.filter((d) =>
    (!txt || dobrarAcentos(`${d.titulo} ${d.ementa || ""}`.toLowerCase()).includes(txt)) &&
    (!f.tema || d.assunto_principal === f.tema || (d.assuntos || []).includes(ASSUNTOS_ROTULOS[f.tema])) &&
    (!f.tipo || d.tipo === f.tipo) &&
    (!f.orgao || d.orgao === f.orgao) && (!f.situacao || d.situacao === f.situacao) &&
    (!f.ano || String(d.ano) === f.ano));
  const alvo = $("#lista-documentos");
  if (!estado.acervo.documentos.length) {
    alvo.replaceChildren(el("p", { classe: "alerta" },
      "O acervo público ainda não possui documentos conferidos e publicados. Documentos coletados aguardam conferência humana antes de serem disponibilizados."));
    return;
  }
  alvo.replaceChildren(el("p", { classe: "ajuda" }, `${docs.length} documento(s)`), ...docs.map((d) => el("article", { classe: "doc-item" },
    el("h3", {}, d.titulo),
    el("p", { classe: "doc-meta" }, `${d.tipo_rotulo} · ${d.orgao}${d.ano ? ` · ${d.ano}` : ""}`),
    el("div", { classe: "selos" }, seloSituacao(d.situacao, d.situacao_rotulo), seloConferencia(d.conferido)),
    (d.indicacoes_portal || []).length
      ? el("p", { classe: "alerta" }, `O portal oficial indica: ${d.indicacoes_portal.join("; ")} (informação ainda não conferida).`)
      : null,
    d.ementa ? el("p", {}, d.ementa.slice(0, 400)) : null,
    el("div", { classe: "links-fonte" },
      el("button", { classe: "botao", type: "button", onclick: () => lerDocumento(d.id) }, "Ler os dispositivos"),
      d.arquivo_url ? linkExterno(d.arquivo_url, "PDF original") : null,
      linkExterno(d.fonte_oficial_url, "Página oficial")),
    d.nota_vigencia ? el("p", { classe: "ajuda" }, el("strong", {}, "Vigência: "), d.nota_vigencia) : null,
    blocoCitacao(d, null))));
}

function lerDocumento(id, indice = estado.indice) {
  const d = indice.documentos.get(id);
  const unidades = indice.unidades.filter((u) => u.doc === id);
  const sec = el("section", { classe: "cartao leitura", "aria-labelledby": "t-leitura" },
    el("h3", { id: "t-leitura", tabindex: "-1" }, d.titulo),
    el("p", { classe: "doc-meta" },
      `SHA-256 do arquivo: ${d.sha256.slice(0, 16)}… · coletado em ${String(d.data_coleta || "").slice(0, 10)}` +
      (d.conferencia ? ` · texto conferido em ${d.conferencia.data}` : " · não conferido")));
  let parteAtual = null;
  for (const u of unidades) {
    if (u.parte !== parteAtual) {
      parteAtual = u.parte;
      sec.append(el("h4", {}, u.parte));
    }
    sec.append(el("p", { classe: "unidade" },
      ["trecho", "apresentacao", "anexo"].includes(u.tipo) ? null : el("span", { classe: "rot" }, `${u.rotulo} — `),
      u.texto, " ", linkExterno(linkPdf(d, u), `(p. ${u.pagina})`)));
  }
  $(indice === estado.indice ? "#leitura-documento" : "#leitura-orientacao").replaceChildren(sec);
  sec.querySelector("h3").focus();
}

function renderizarGuia() {
  const secao = (titulo, ...filhos) => el("section", { classe: "cartao" }, el("h3", {}, titulo), ...filhos);
  $("#guia").replaceChildren(
    secao("O que a plataforma faz",
      el("p", {}, "Você escreve uma dúvida sobre o exercício profissional e a plataforma localiza, nos documentos oficiais do Conjunto CFESS-CRESS, os artigos e trechos relacionados. Cada trecho aparece com o texto literal, o documento, o dispositivo, a página e o link para o PDF oficial."),
      el("p", {}, "Ela não dá parecer, não julga casos e não substitui a orientação do CRESS. Serve para encontrar e ler as normas com mais rapidez e segurança.")),
    secao("Como fazer uma boa pergunta",
      el("ul", { classe: "lista-simples" },
        el("li", {}, "Descreva a situação de forma geral, sem nomes ou dados que identifiquem pessoas."),
        el("li", {}, "Use as palavras do dia a dia do trabalho: “sigilo”, “laudo”, “estágio”, “sala de atendimento”."),
        el("li", {}, "Se já sabe qual norma quer ler, cite o número: “Res. 533/2008”, “Lei 8.662”, “Código Processual de Ética”. A norma citada aparece primeiro."),
        el("li", {}, "Se a dúvida é sobre fatos antigos, diga o ano (“em 2015…”): normas hoje revogadas também aparecem, com aviso."),
        el("li", {}, "Se o resultado não ajudar, reformule com outros termos ou procure o documento na Biblioteca normativa."))),
    secao("Como ler o resultado",
      el("ul", { classe: "lista-simples" },
        el("li", {}, el("strong", {}, "Selo de situação: "), "Vigente, Vigente com alterações, Revogada ou Suspensa/invalidada por decisão judicial. Normas que não estão em vigor aparecem com aviso e menos destaque."),
        el("li", {}, el("strong", {}, "Texto conferido: "), "o texto foi comparado com o PDF oficial por pessoa responsável."),
        el("li", {}, el("strong", {}, "Avisos no trecho: "), "indicam quando um dispositivo específico foi alterado ou revogado, com a norma que o alterou."),
        el("li", {}, el("strong", {}, "Relação com a pergunta: "), "mostra por quais palavras o trecho foi encontrado. A pertinência ao seu caso depende da sua leitura."))),
    secao("Para estudantes, docentes e supervisão de estágio",
      el("ul", { classe: "lista-simples" },
        el("li", {}, "Em cada trecho e em cada documento da Biblioteca há o botão “Como citar (ABNT)”, com a referência e a citação no texto prontas para copiar."),
        el("li", {}, "Na Biblioteca normativa, filtre por tema, situação ou ano e use “Ler os dispositivos” para ler a norma inteira, artigo por artigo, com link para cada página do PDF."),
        el("li", {}, "O botão “Imprimir ou salvar em PDF” gera uma versão da resposta para estudo, aula ou registro."),
        el("li", {}, "Em trabalhos acadêmicos, cite a norma oficial (o PDF ou a página do CFESS), não esta plataforma."))),
    secao("Instalar no celular ou no computador",
      el("p", {}, "A plataforma pode ser instalada como aplicativo: abre em janela própria, tem ícone na tela inicial e continua funcionando sem internet com o acervo guardado no aparelho."),
      el("div", { id: "instalar", classe: "instalar" })),
    secao("Glossário",
      el("dl", { classe: "glossario" }, GLOSSARIO.flatMap(([termo, def]) => [el("dt", {}, termo), el("dd", {}, def)]))));
}

// ---------------------------------------------------------------- transparência
function renderizarTransparencia() {
  const a = estado.acervo;
  const conferidos = a.documentos.filter((d) => d.conferido).length;
  const modelo = estado.motor ? MODELOS[estado.motor.modelo] : null;
  $("#transparencia").replaceChildren(
    el("section", { classe: "cartao" },
      el("h3", {}, "Natureza do projeto"),
      el("p", {}, "Plataforma independente, gratuita e de código aberto, desenvolvida no âmbito do GPECSS para facilitar a localização e a leitura de normas e orientações do exercício profissional do Serviço Social. Não é um canal oficial do CFESS ou dos CRESS e não fala em nome desses órgãos."),
      el("p", {}, "As respostas apresentam trechos literais de documentos oficiais, com indicação do documento, do dispositivo e da página, para que você possa conferir a fonte original."),
      el("p", {}, el("strong", {}, "Idealização: "), "Vinícius Araújo Pereira, assistente social."),
      el("p", {}, el("strong", {}, "Base em texto para o NotebookLM: "),
        el("a", { href: "baixar/praxia-base-notebooklm.zip", download: "" }, "baixar o compilado (.zip, 1,4 MB)"),
        " — texto integral das normas e das orientações institucionais, com vigência e links oficiais, em dois arquivos .txt para usar como fontes."),
      el("h3", {}, "Acervo"),
      el("p", {}, `${a.documentos.length} documento(s) neste índice, dos quais ${conferidos} conferido(s) por pessoa responsável; ${a.unidades.length} dispositivos e trechos indexados. ` +
        (a.gerado_em ? `Índice gerado em ${a.gerado_em.slice(0, 10)}.` : "Índice indisponível.")),
      el("p", {}, "Documentos novos passam por coleta automática nos portais oficiais e só são publicados após conferência humana de texto, metadados e vigência."),
      el("h3", {}, "Inteligência artificial"),
      el("p", {}, "O modo documental (trechos comprobatórios literais) não usa inteligência artificial. A análise interpretativa por IA é opcional e só funciona se você a ativar no painel \"Análise por IA no meu dispositivo\", que mostra antes as exigências do modelo e o que o seu aparelho oferece. O modelo roda no seu navegador; a pergunta não é enviada a servidores. Você pode desativá-la e remover os arquivos baixados a qualquer momento."),
      chatAtivo() ? el("p", {}, "Chat (opcional e gratuito): só quando você pede e confirma o aviso, a pergunta e até 8 trechos oficiais já encontrados " +
        "são enviados ao Gemini, do Google, no nível gratuito, por um intermediário que não guarda perguntas nem respostas. No nível gratuito o Google pode usar o " +
        "conteúdo para melhorar os próprios produtos; por isso, nunca escreva dados sensíveis. Há limites diários para o serviço continuar gratuito para todos. " +
        "As respostas do chat são automáticas, não conferidas, e não substituem as respostas do CFESS, dos CRESS e das demais instituições da categoria.") : null,
      modelo
        ? el("p", {}, `Ativa neste dispositivo: ${modelo.rotulo} (licença ${modelo.licenca}), executado com WebLLM.`)
        : el("p", {}, CONFIG.llm.permitirAtivacao
          ? "A análise por IA não está ativada neste dispositivo."
          : "A análise por IA ainda está em avaliação e só será liberada após revisão por profissionais."),
      el("p", {}, `Biblioteca de execução prevista: WebLLM (${WEBLLM_URL.split("/npm/")[1].replace("/+esm", "")}).`),
      el("h3", {}, "Privacidade"),
      el("ul", { classe: "lista-simples" },
        el("li", {}, "Sem cadastro, sem cookies de rastreamento e sem ferramentas de análise de audiência."),
        el("li", {}, chatAtivo() ? "A busca é feita no seu navegador e a pergunta não é armazenada. Ela só é enviada (ao Gemini, do Google) se você pedir a explicação pelo chat e confirmar o aviso." : "A pergunta é processada no seu navegador e não é armazenada nem enviada a servidores."),
        el("li", {}, "Dados que pareçam identificar pessoas (CPF, telefone, e-mail, nomes após termos como \"usuária\" ou \"paciente\") são mascarados antes da análise.")),
      el("h3", {}, "Limitações conhecidas"),
      el("ul", { classe: "lista-simples" },
        el("li", {}, "A busca atual é por termos (com sinônimos do vocabulário da profissão e prioridade para normas citadas pelo número); a busca por sentido ainda está em avaliação."),
        el("li", {}, "O acervo reúne as normas nacionais do CFESS conferidas (inclusive as revogadas, para consulta histórica); normas regionais dos CRESS serão incluídas depois."),
        el("li", {}, "A situação de vigência é registrada pela equipe; quando não verificada, isso é indicado em cada trecho.")),
      el("h3", {}, "Canais oficiais"),
      el("p", {}, linkExterno(CANAIS_VERIFICADOS.enderecosCress.url, CANAIS_VERIFICADOS.enderecosCress.rotulo),
        " · ", linkExterno(CANAIS_VERIFICADOS.legislacaoCfess.url, CANAIS_VERIFICADOS.legislacaoCfess.rotulo))));
}

// ---------------------------------------------------------------- abas
function configurarAbas() {
  const abas = [...document.querySelectorAll('[role="tab"]')];
  const ativar = (aba) => {
    for (const a of abas) {
      const sel = a === aba;
      a.setAttribute("aria-selected", String(sel));
      a.tabIndex = sel ? 0 : -1;
      document.getElementById(a.getAttribute("aria-controls")).hidden = !sel;
    }
    aba.focus();
    aba.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };
  abas.forEach((a, i) => {
    a.addEventListener("click", () => ativar(a));
    a.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") ativar(abas[(i + 1) % abas.length]);
      if (ev.key === "ArrowLeft") ativar(abas[(i - 1 + abas.length) % abas.length]);
    });
  });
}

// ---------------------------------------------------------------- início
configurarTema();
configurarConexao();
configurarModo();
configurarInstalacao();
configurarAbas();
$("#form-consulta").addEventListener("submit", aoConsultar);
// Enter envia (como nos assistentes de IA); Shift+Enter quebra a linha.
$("#pergunta").addEventListener("input", ajustarAltura);
$("#nova-conversa").addEventListener("click", novaConversa);
$("#saiba-mais").addEventListener("click", () => $("#aba-sobre-ia").click());
window.addEventListener("beforeprint", () => document.querySelectorAll("#conversa .fonte-trecho").forEach((d) => { d.hidden = false; }));
$("#pergunta").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
    ev.preventDefault();
    enviarFormulario($("#form-consulta"));
  }
});
renderizarGuia();
await carregarAcervo();
preencherFiltros();
// Camada 2 em segundo plano: a consulta funciona antes dela; ao chegar, passa a acompanhar as respostas.
carregarInterpretacao().then(listarOrientacoes);
carregarCandidatas();
listarDocumentos();
renderizarTransparencia();
renderizarInstalacao();
atualizarEstadoChat();
// Atalhos do app instalado (?aba=biblioteca, ?aba=guia).
const abaInicial = new URLSearchParams(location.search).get("aba");
if (abaInicial) document.getElementById(`aba-${abaInicial}`)?.click();

// O painel de IA (e a biblioteca WebLLM) só é carregado quando a pessoa o abre.
// Se ela o abriu antes do fim do carregamento da página, monta agora.
let painelIARenderizado = false;
const abrirPainelIA = () => {
  if ($("#painel-ia").open && !painelIARenderizado) {
    painelIARenderizado = true;
    renderizarPainelIA().catch((erro) => {
      console.error(erro);
      $("#conteudo-ia").replaceChildren(el("p", { classe: "alerta" },
        `Não foi possível montar o painel de IA (${erro.message}). O modo documental continua disponível.`));
    });
  }
};
$("#painel-ia").addEventListener("toggle", abrirPainelIA);
// IA completa guardada (D43): o painel só aparece onde a ativação é permitida (teste local).
$("#painel-ia").hidden = !iaPermitida();
// ?ia=1: abre o painel já na chave de ativação (o download só começa quando a pessoa liga a chave, D17).
if (iaPermitida() && new URLSearchParams(location.search).get("ia") === "1") {
  $("#painel-ia").open = true;
  $("#painel-ia").scrollIntoView({ block: "start" });
}
abrirPainelIA();

// Busca por sentido: painel montado ao abrir; se a pessoa já a tinha ativado, prepara
// em segundo plano (o modelo vem do cache do navegador).
let painelSentidoRenderizado = false;
$("#painel-sentido").addEventListener("toggle", () => {
  if ($("#painel-sentido").open && !painelSentidoRenderizado) {
    painelSentidoRenderizado = true;
    renderizarPainelSentido().catch((erro) => $("#conteudo-sentido").replaceChildren(
      el("p", { classe: "alerta" }, `Não foi possível montar o painel (${erro.message}).`)));
  }
});
if (lerPreferenciaSentido() && estado.acervo.unidades.length) {
  atualizarEstadoSentido("· Preparando a busca por sentido…");
  prepararSentido(() => {}).then(() => atualizarEstadoSentido(), () => {
    estado.semantica = null;
    atualizarEstadoSentido("· Busca por sentido indisponível agora (usando só termos)");
  });
}

registrarServiceWorker();

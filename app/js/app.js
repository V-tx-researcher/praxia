"use strict";

import { CONFIG } from "./config.js";
import { IndiceLexical } from "./nucleo/busca.js";
import { consultar } from "./nucleo/resposta.js";
import { CANAIS_VERIFICADOS } from "./nucleo/orientacao.js";
import { linkPdf } from "./nucleo/evidencias.js";
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
  const classe = { vigente_confirmada: "vigente", alterada: "vigente", revogada: "revogada",
    historica: "historica", nao_verificada: "nao-verificada" }[situacao] || "";
  return el("span", { classe: `selo ${classe}` }, rotulo);
}

function seloConferencia(conferido) {
  return conferido
    ? el("span", { classe: "selo vigente" }, "Texto conferido")
    : el("span", { classe: "selo nao-conferido" }, "Texto NÃO conferido (prévia)");
}

// ---------------------------------------------------------------- estado
const estado = { acervo: null, indice: null, modo: null, motor: null };

function ambienteLocal() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) || location.hostname.endsWith(".localhost");
}

async function carregarAcervo() {
  const params = new URLSearchParams(location.search);
  let modo = CONFIG.acervoPadrao;
  if (params.get("acervo") === "previa" && ambienteLocal()) modo = "previa";
  const arquivo = modo === "previa" ? "dados/acervo-previa.json" : "dados/acervo-publico.json";
  try {
    const r = await fetch(arquivo, { cache: "no-cache" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    estado.acervo = await r.json();
  } catch (erro) {
    estado.acervo = { modo, documentos: [], unidades: [], gerado_em: null, erro: String(erro) };
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
    alvo.textContent = "Modo documental: trechos literais, sem análise por IA";
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
  if (ok === true) return el("span", { classe: "marca ok", "aria-label": "atende" }, "✓");
  if (ok === false) return el("span", { classe: "marca falha", "aria-label": "não atende" }, "✗");
  return el("span", { classe: "marca duvida", "aria-label": "não foi possível confirmar" }, "?");
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
async function aoConsultar(ev) {
  ev.preventDefault();
  const pergunta = $("#pergunta").value.trim();
  const saida = $("#resultado");
  if (pergunta.length < 8) {
    saida.replaceChildren(el("p", { classe: "alerta" }, "Digite uma pergunta com pelo menos algumas palavras."));
    $("#pergunta").focus();
    return;
  }
  const botao = $("#consultar");
  botao.disabled = true;
  botao.textContent = "Consultando…";
  saida.replaceChildren();
  const lista = el("ol");
  $("#progresso").replaceChildren(el("p", {}, "Etapas da análise:"), lista);
  try {
    const r = await consultar(estado.indice, pergunta, {
      motorLLM: estado.motor,
      aoProgresso: (nome, detalhe) => lista.append(el("li", {}, `${nome}: ${detalhe}`)),
    });
    renderizarResposta(r);
  } catch (erro) {
    saida.replaceChildren(el("p", { classe: "alerta" }, `Não foi possível concluir a consulta: ${erro.message}`));
  } finally {
    botao.disabled = false;
    botao.textContent = "Consultar";
  }
}

function botaoRef(id) {
  return el("a", { classe: "ref", href: `#ev-${id}`, "aria-label": `ver evidência ${id}`,
    onclick: () => destacar(id) }, id);
}

function destacar(id) {
  document.querySelectorAll(".evidencia.destacada").forEach((x) => x.classList.remove("destacada"));
  document.getElementById(`ev-${id}`)?.classList.add("destacada");
}

function cartaoEvidencia(e, afirmacoesQueCitam) {
  const d = e.documento;
  const cab = el("div", { classe: "evidencia-cabecalho" },
    el("div", {}, el("span", { classe: "evidencia-id" }, e.id), el("span", { classe: "evidencia-doc" }, d.titulo)),
    el("div", { classe: "selos" }, seloSituacao(d.situacao, d.situacaoRotulo), seloConferencia(d.conferido)));
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
        : "selecionado por termos relacionados aos da pergunta. ",
      "A pertinência ao caso deve ser avaliada na leitura.");
  }
  return el("article", { classe: "evidencia", id: `ev-${e.id}` },
    cab,
    el("p", { classe: "evidencia-local" }, `${d.tipo} · ${d.orgao}${d.ano ? ` · ${d.ano}` : ""} — ${e.localizacao}`),
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
      linkExterno(d.fonteOficial, "Página oficial do documento")));
}

function renderizarResposta(r) {
  const saida = $("#resultado");
  const blocos = [];
  if (r.alertaPrivacidade) blocos.push(el("section", {}, el("p", { classe: "alerta" }, r.alertaPrivacidade)));
  const analise = r.secoes.find((s) => s.id === "analise");
  const citacoesPorEvidencia = new Map();
  (analise?.afirmacoes || []).forEach((a, i) => a.evidencias.forEach((id) => {
    if (!citacoesPorEvidencia.has(id)) citacoesPorEvidencia.set(id, []);
    citacoesPorEvidencia.get(id).push(i + 1);
  }));

  for (const s of r.secoes) {
    const sec = el("section", { "aria-labelledby": `t-${s.id}` }, el("h2", { id: `t-${s.id}` }, s.titulo));
    for (const p of s.paragrafos || []) sec.append(el("p", {}, p));
    if (s.afirmacoes) {
      s.afirmacoes.forEach((a, i) => sec.append(el("p", { classe: "afirmacao" },
        el("span", { classe: "natureza" }, `${i + 1}. ${a.natureza === "interpretacao" ? "Interpretação proposta" : "O que a norma estabelece"}`),
        a.texto, ...a.evidencias.map(botaoRef))));
      if (s.notaVerificacao) sec.append(el("p", { classe: "ajuda" }, s.notaVerificacao));
      sec.append(el("p", { classe: "ajuda" }, "Texto gerado por IA local a partir exclusivamente das evidências abaixo e verificado automaticamente. Pode conter erros."));
    }
    if (s.evidencias) {
      s.evidencias.forEach((e) => sec.append(cartaoEvidencia(e, citacoesPorEvidencia.get(e.id))));
      if (s.outras?.length) {
        const det = el("details", {}, el("summary", {}, `Outros ${s.outras.length} trechos localizados, não utilizados na análise`));
        s.outras.forEach((e) => det.append(cartaoEvidencia(e)));
        sec.append(det);
      }
    }
    if (s.itens) sec.append(el("ul", { classe: "lista-simples" }, s.itens.map((t) => el("li", {}, t))));
    if (s.diferencas) sec.append(el("p", { classe: "ajuda" }, s.diferencas));
    if (s.canais) sec.append(el("p", {}, s.canais.map((c) => linkExterno(c.url, c.rotulo))));
    if (s.documentos) {
      sec.append(el("ul", { classe: "lista-simples" }, s.documentos.map((d) => el("li", {},
        linkExterno(d.link, d.titulo), " — ", d.situacaoRotulo,
        " · ", linkExterno(d.fonteOficial, "página oficial")))));
    }
    blocos.push(sec);
  }
  saida.replaceChildren(...blocos);
  saida.querySelector("h2")?.setAttribute("tabindex", "-1");
  saida.querySelector("h2")?.focus();
}

// ---------------------------------------------------------------- biblioteca
function preencherFiltros() {
  const docs = estado.acervo.documentos;
  const opcoes = (sel, valores) => {
    for (const [v, rot] of valores) $(sel).append(el("option", { value: v }, rot));
  };
  const unicos = (f) => [...new Map(docs.map((d) => [f(d)[0], f(d)])).values()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  opcoes("#f-tipo", unicos((d) => [d.tipo, d.tipo_rotulo]));
  opcoes("#f-orgao", unicos((d) => [d.orgao, d.orgao]));
  opcoes("#f-situacao", unicos((d) => [d.situacao, d.situacao_rotulo]));
  opcoes("#f-ano", unicos((d) => [String(d.ano ?? ""), d.ano ?? "sem ano"]).filter(([v]) => v));
  for (const id of ["#f-texto", "#f-tipo", "#f-orgao", "#f-situacao", "#f-ano"]) $(id).addEventListener("input", listarDocumentos);
}

function listarDocumentos() {
  const txt = $("#f-texto").value.trim().toLowerCase();
  const f = { tipo: $("#f-tipo").value, orgao: $("#f-orgao").value, situacao: $("#f-situacao").value, ano: $("#f-ano").value };
  const docs = estado.acervo.documentos.filter((d) =>
    (!txt || d.titulo.toLowerCase().includes(txt)) && (!f.tipo || d.tipo === f.tipo) &&
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
      linkExterno(d.fonte_oficial_url, "Página oficial")))));
}

function lerDocumento(id) {
  const d = estado.indice.documentos.get(id);
  const unidades = estado.acervo.unidades.filter((u) => u.doc === id);
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
      ["trecho", "apresentacao"].includes(u.tipo) ? null : el("span", { classe: "rot" }, `${u.rotulo} — `),
      u.texto, " ", linkExterno(linkPdf(d, u), `(p. ${u.pagina})`)));
  }
  $("#leitura-documento").replaceChildren(sec);
  sec.querySelector("h3").focus();
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
      el("h3", {}, "Acervo"),
      el("p", {}, `${a.documentos.length} documento(s) neste índice, dos quais ${conferidos} conferido(s) por pessoa responsável; ${a.unidades.length} dispositivos e trechos indexados. ` +
        (a.gerado_em ? `Índice gerado em ${a.gerado_em.slice(0, 10)}.` : "Índice indisponível.")),
      el("p", {}, "Documentos novos passam por coleta automática nos portais oficiais e só são publicados após conferência humana de texto, metadados e vigência."),
      el("h3", {}, "Inteligência artificial"),
      el("p", {}, "O modo documental (trechos comprobatórios literais) não usa inteligência artificial. A análise interpretativa por IA é opcional e só funciona se você a ativar no painel \"Análise por IA no meu dispositivo\", que mostra antes as exigências do modelo e o que o seu aparelho oferece. O modelo roda no seu navegador; a pergunta não é enviada a servidores. Você pode desativá-la e remover os arquivos baixados a qualquer momento."),
      modelo
        ? el("p", {}, `Ativa neste dispositivo: ${modelo.rotulo} (licença ${modelo.licenca}), executado com WebLLM.`)
        : el("p", {}, CONFIG.llm.permitirAtivacao
          ? "A análise por IA não está ativada neste dispositivo."
          : "A análise por IA ainda está em avaliação e só será liberada após revisão por profissionais."),
      el("p", {}, `Biblioteca de execução prevista: WebLLM (${WEBLLM_URL.split("/npm/")[1].replace("/+esm", "")}).`),
      el("h3", {}, "Privacidade"),
      el("ul", { classe: "lista-simples" },
        el("li", {}, "Sem cadastro, sem cookies de rastreamento e sem ferramentas de análise de audiência."),
        el("li", {}, "A pergunta é processada no seu navegador e não é armazenada nem enviada a servidores."),
        el("li", {}, "Dados que pareçam identificar pessoas (CPF, telefone, e-mail, nomes após termos como \"usuária\" ou \"paciente\") são mascarados antes da análise.")),
      el("h3", {}, "Limitações conhecidas"),
      el("ul", { classe: "lista-simples" },
        el("li", {}, "A busca atual é lexical (por termos, com sinônimos do domínio); a busca semântica ainda está em desenvolvimento."),
        el("li", {}, "O acervo está em formação e começa pelos documentos nacionais do CFESS; normas regionais dos CRESS serão incluídas depois."),
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
configurarAbas();
$("#form-consulta").addEventListener("submit", aoConsultar);
await carregarAcervo();
preencherFiltros();
listarDocumentos();
renderizarTransparencia();

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
abrirPainelIA();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

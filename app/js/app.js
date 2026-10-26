"use strict";

import { CONFIG } from "./config.js";
import { IndiceLexical } from "./nucleo/busca.js";
import { consultar } from "./nucleo/resposta.js";
import { CANAIS_VERIFICADOS } from "./nucleo/orientacao.js";
import { linkPdf } from "./nucleo/evidencias.js";
import { MODELOS, MotorWebLLM, WEBLLM_URL, webgpuDisponivel } from "./llm/motor.js";

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
const estado = { acervo: null, indice: null, modo: null, motor: null, llmTeste: false };

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

  // Motor de LLM: habilitado por configuração, ou em teste local explícito (?llm=MODELO).
  const modeloTeste = params.get("llm");
  if (CONFIG.llm.habilitado && CONFIG.llm.modelo) {
    estado.motor = new MotorWebLLM(CONFIG.llm.modelo, { aoProgresso: progressoModelo });
  } else if (modeloTeste && MODELOS[modeloTeste] && ambienteLocal()) {
    estado.motor = new MotorWebLLM(modeloTeste, { aoProgresso: progressoModelo });
    estado.llmTeste = true;
  }
  atualizarEstadoIA();
}

function atualizarEstadoIA() {
  const alvo = $("#estado-ia");
  if (!estado.motor) {
    alvo.textContent = "Modo documental (análise por IA desabilitada nesta versão)";
  } else if (!webgpuDisponivel()) {
    alvo.textContent = "IA local indisponível neste navegador (sem WebGPU) — modo documental";
    estado.motor = null;
  } else {
    alvo.textContent = `IA local: ${MODELOS[estado.motor.modelo].rotulo}${estado.llmTeste ? " — TESTE INTERNO" : ""}`;
  }
}

function progressoModelo(texto) {
  $("#progresso").textContent = `Preparando o modelo local: ${texto}`;
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
    el("blockquote", { classe: "trecho", cite: e.link }, e.texto),
    relacao,
    e.vigencia.avisos.length ? el("p", { classe: "relacao" }, el("strong", {}, "Vigência: "), e.vigencia.avisos.join(" ")) : null,
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
      (d.conferencia ? ` · conferido em ${d.conferencia.data} por ${d.conferencia.responsavel}` : " · não conferido")));
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
      el("h3", {}, "Acervo"),
      el("p", {}, `${a.documentos.length} documento(s) neste índice, dos quais ${conferidos} conferido(s) por pessoa responsável; ${a.unidades.length} dispositivos e trechos indexados. ` +
        (a.gerado_em ? `Índice gerado em ${a.gerado_em.slice(0, 10)}.` : "Índice indisponível.")),
      el("p", {}, "Documentos novos passam por coleta automática nos portais oficiais e só são publicados após conferência humana de texto, metadados e vigência."),
      el("h3", {}, "Inteligência artificial"),
      modelo
        ? el("p", {}, `Análise interpretativa gerada no próprio dispositivo pelo modelo ${modelo.rotulo} (licença ${modelo.licenca}), executado com WebLLM. O modelo é baixado uma vez (cerca de ${Math.round(modelo.memoriaMB / 100) / 10} GB) e fica no cache do navegador. A pergunta não é enviada a servidores.`)
        : el("p", {}, "Nesta versão, a análise interpretativa por IA está desabilitada: a plataforma apresenta os dispositivos localizados, com texto literal. A IA local será habilitada somente após avaliação documentada de qualidade e segurança."),
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

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

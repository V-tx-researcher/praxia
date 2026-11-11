// Chat da PraxIA (D44/D46): pede ao Gemini, pelo intermediário gratuito, uma explicação curta que
// INDICA o material oficial já encontrado pela busca local. Só envia a pergunta e até 8 trechos
// oficiais; nunca o acervo inteiro. Só envia quando a pessoa pede e confirma o aviso.
// Gratuidade: além dos tetos do intermediário, cada navegador tem um limite diário e um
// intervalo mínimo entre pedidos, para a cota gratuita ser repartida entre todas as pessoas.
import { detectarDadosPessoais } from "./privacidade.js";
import { categoriaDe } from "./categorias.js";

const CHAVE = "praxia-chat-uso";
const MAX_TRECHOS = 8;

function hoje() { return new Date().toISOString().slice(0, 10); }

function lerUso() {
  try {
    const u = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    return u.dia === hoje() ? u : { dia: hoje(), n: 0, ultimo: 0 };
  } catch { return { dia: hoje(), n: 0, ultimo: 0 }; }
}
function gravarUso(u) { try { localStorage.setItem(CHAVE, JSON.stringify(u)); } catch { /* sem armazenamento: vale o teto do intermediário */ } }

// Situação do limite local: { pode, restantes, esperarSegundos, motivo }
export function situacaoLimite(cfg, agora = Date.now()) {
  const u = lerUso();
  const restantes = Math.max(0, cfg.limiteDiario - u.n);
  const esperar = Math.max(0, Math.ceil((u.ultimo + cfg.intervaloSegundos * 1000 - agora) / 1000));
  if (!restantes) return { pode: false, restantes, esperarSegundos: 0, motivo: `Você já usou as ${cfg.limiteDiario} explicações de hoje neste navegador. Amanhã libera de novo; a busca e os documentos continuam disponíveis.` };
  if (esperar) return { pode: false, restantes, esperarSegundos: esperar, motivo: `Aguarde ${esperar} segundo(s) para pedir outra explicação.` };
  return { pode: true, restantes, esperarSegundos: 0, motivo: "" };
}

// Bloqueia o envio se a pergunta parecer ter dados que identificam pessoas.
export function bloqueioPrivacidade(pergunta) {
  const achados = detectarDadosPessoais(pergunta);
  if (!achados.length) return null;
  const tipos = [...new Set(achados.map((a) => a.tipo))].join(", ");
  return `A pergunta parece conter dado que identifica pessoas (${tipos}). Por segurança, ela não será enviada à IA. Reescreva a dúvida de forma geral, sem nomes, documentos ou números.`;
}

// Trechos na ordem de relevância: primeiro os que se aplicam, depois orientações; fora os "provavelmente não se aplica".
export const localDe = (e) => (["trecho", "apresentacao", "anexo"].includes(e.tipo) ? `p. ${e.pagina}` : e.rotulo);

// Modo Trilhas (D53): fontes ampliadas — os trechos principais, as orientações e um trecho de cada
// documento do panorama (P1, P2…), até MAX_TRILHAS. Revogadas nunca entram (o panorama já as separa).
export const MAX_TRILHAS = 24;
export function fontesTrilhas(evidencias = [], orientacoes = [], panorama = null, max = MAX_TRILHAS) {
  const lista = escolherFontes(evidencias, orientacoes);
  const vistos = new Set(lista.map((e) => e.unidadeId));
  const docs = new Set(lista.map((e) => `${e.documento.id}|${e.parte || ""}`));
  let n = 0;
  // Uma volta por categoria de cada vez, para a trilha cobrir todos os tipos de documento.
  const filas = (panorama?.categorias || []).map((g) => [...g.documentos]);
  while (lista.length < max && filas.some((f) => f.length)) {
    for (const f of filas) {
      const it = f.shift();
      if (!it || lista.length >= max) continue;
      if (vistos.has(it.unidadeId) || docs.has(`${it.documento.id}|${it.parte || ""}`)) continue;
      vistos.add(it.unidadeId); docs.add(`${it.documento.id}|${it.parte || ""}`);
      lista.push({ ...it, id: `P${++n}`, tipo: it.camada === 2 ? "trecho" : "dispositivo", contexto: [] });
    }
  }
  return lista;
}

// As fontes de uma resposta (objetos de evidência completos, para exibir trecho e link).
export function escolherFontes(evidencias = [], orientacoes = []) {
  const ordem = { principal: 0, relacionada: 1 };
  const normas = evidencias.filter((e) => e.prioridade !== "complementar")
    .sort((a, b) => (ordem[a.prioridade] ?? 1) - (ordem[b.prioridade] ?? 1));
  const lista = [...normas.slice(0, 5), ...orientacoes.slice(0, 3)];
  for (const e of normas.slice(5)) if (lista.length < MAX_TRECHOS) lista.push(e);
  return lista.slice(0, MAX_TRECHOS);
}

// Nome da fonte: lei publicada dentro de outro documento (ex.: Lei 8.662/1993 no livreto do Código
// de Ética) aparece com o nome da lei, não do livreto.
export function tituloFonte(e) {
  return categoriaDe(e.documento, e.parte).id === "lei" && e.parte ? e.parte : e.documento.titulo;
}

export function paraTrecho(e) {
  const cat = categoriaDe(e.documento, e.parte);
  const documento = cat.id === "lei" && e.parte ? `${e.parte} (texto publicado em: ${e.documento.titulo})` : e.documento.titulo;
  return { id: e.id, categoria: cat.rotulo, documento, local: localDe(e), texto: e.texto };
}

export function montarTrechos(evidencias = [], orientacoes = []) {
  return escolherFontes(evidencias, orientacoes).map(paraTrecho);
}

// Identificadores citados pela IA, na ordem em que aparecem.
export function idsCitados(texto, idsValidos) {
  const vistos = [];
  for (const m of String(texto).matchAll(/[EOPB]\d{1,2}/g)) if (idsValidos.has(m[0]) && !vistos.includes(m[0])) vistos.push(m[0]);
  return vistos;
}

export async function pedirExplicacao(cfg, pergunta, trechos, modo = "biblioteca") {
  const u = lerUso();
  u.n += 1; u.ultimo = Date.now(); gravarUso(u); // conta antes: um pedido que falha também gasta cota
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(cfg.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ pergunta, trechos, modo }), credentials: "omit", referrerPolicy: "no-referrer",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.texto) return { erro: j.erro || `O serviço respondeu com o código ${r.status}. A busca local continua funcionando.` };
    return { texto: j.texto, modelo: j.modelo };
  } catch {
    return { erro: "Não foi possível falar com o serviço de IA agora. A busca local continua funcionando." };
  } finally { clearTimeout(t); }
}

// Texto do modelo → partes seguras: { tipo: "texto"|"ref", valor }. Nada é inserido como HTML.
export function partesDoTexto(texto, idsValidos) {
  const limpo = String(texto).replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[-*]\s+/gm, "• ");
  // Aceita [E1] e também grupos como [E2, E4] ou [E1; O2].
  return limpo.split(/\n{2,}/).map((par) => par.split(/(\[[EOPB]\d{1,2}(?:\s*[,;]\s*[EOPB]\d{1,2})*\]|⟦SF⟧|⟦FR⟧)/g).filter(Boolean).flatMap((p) => {
    if (p === "⟦SF⟧") return [{ tipo: "aviso", valor: "sem fonte indicada: confira" }];
    if (p === "⟦FR⟧") return [{ tipo: "aviso", valor: "fonte pouco relacionada: confira" }];
    const m = p.match(/^\[([EOPB]\d{1,2}(?:\s*[,;]\s*[EOPB]\d{1,2})*)\]$/);
    if (!m) return [{ tipo: "texto", valor: p }];
    const ids = m[1].split(/\s*[,;]\s*/);
    if (!ids.every((id) => idsValidos.has(id))) return [{ tipo: "texto", valor: p }];
    return ids.flatMap((id, i) => (i ? [{ tipo: "texto", valor: " " }, { tipo: "ref", valor: id }] : [{ tipo: "ref", valor: id }]));
  }));
}

// D56: conferência das frases da IA, no navegador (não depende de o modelo obedecer).
// - frase que fala do que documentos dizem, sem identificador → aviso "sem fonte";
// - frase com identificador cujas palavras quase não aparecem nos trechos citados → aviso "fonte pouco relacionada".
// O texto não é apagado: a pessoa vê o aviso e confere. Marcadores internos: ⟦SF⟧ e ⟦FR⟧.
const FALA_DE_DOCUMENTO = /\b(normas?|resolu[cç](?:[aã]o|[oõ]es)|orienta[cç](?:[aã]o|[oõ]es)|literatura|c[oó]digo|lei|nota[s]? t[eé]cnica|parecer(?:es)?|cartilhas?|documentos? (?:oficiais|das entidades)|(?:o|a)s? (?:cfess|cress|abepss) (?:orienta|indica|afirma|recomenda|prev[eê]|estabelece|determina)|prev[eê]|estabelece|determina|disp[oõ]e|aponta)/i;
const FECHO = /n[aã]o substitui, de nenhuma maneira/i;
// Frases de ressalva ("tais orientações não substituem as normas") não afirmam conteúdo: não pedem fonte.
const RESSALVA = /n[aã]o (substitu|s[aã]o normas?|tem for[cç]a)|servem? (de|como) subs[ií]dio|confira|consulte o cress/i;
const REF = /\[([EOPB]\d{1,2}(?:\s*[,;]\s*[EOPB]\d{1,2})*)\]/g;
const radical = (w) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().slice(0, 6);
const palavras = (t) => (String(t).match(/[\p{L}]{5,}/gu) || []).map(radical);
const VAZIAS = new Set(["assist", "social", "servic", "profis", "trabal", "possiv", "indica", "tambem", "pessoa", "situac", "questa", "segund", "acordo", "podem", "atuaca", "entida", "orient", "normas", "litera", "docume"]);

export function conferirFrases(texto, fontesPorId) {
  return String(texto).split(/\n{2,}/).map((par) => {
    const frases = par.match(/[^.!?]+(?:[.!?]+|$)\s*/g) || [par];
    return frases.map((f) => {
      if (FECHO.test(f) || f.trim().length < 25) return f;
      const ids = [...f.matchAll(REF)].flatMap((m) => m[1].split(/\s*[,;]\s*/)).filter((id) => fontesPorId.has(id));
      const fim = f.match(/\s*$/)[0];
      const corpo = f.slice(0, f.length - fim.length);
      if (!ids.length) return FALA_DE_DOCUMENTO.test(f) && !RESSALVA.test(f) ? `${corpo} ⟦SF⟧${fim}` : f;
      const ditas = new Set(palavras(f.replace(REF, "")).filter((w) => !VAZIAS.has(w)));
      if (ditas.size < 3) return f;
      const fonte = new Set(ids.flatMap((id) => palavras(fontesPorId.get(id))));
      const comuns = [...ditas].filter((w) => fonte.has(w)).length;
      return comuns / ditas.size < 0.15 ? `${corpo} ⟦FR⟧${fim}` : f;
    }).join("");
  }).join("\n\n");
}

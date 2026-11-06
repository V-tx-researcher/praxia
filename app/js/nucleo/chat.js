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
  for (const m of String(texto).matchAll(/[EO]\d{1,2}/g)) if (idsValidos.has(m[0]) && !vistos.includes(m[0])) vistos.push(m[0]);
  return vistos;
}

export async function pedirExplicacao(cfg, pergunta, trechos) {
  const u = lerUso();
  u.n += 1; u.ultimo = Date.now(); gravarUso(u); // conta antes: um pedido que falha também gasta cota
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(cfg.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ pergunta, trechos }), credentials: "omit", referrerPolicy: "no-referrer",
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
  return limpo.split(/\n{2,}/).map((par) => par.split(/(\[[EO]\d{1,2}(?:\s*[,;]\s*[EO]\d{1,2})*\])/g).filter(Boolean).flatMap((p) => {
    const m = p.match(/^\[([EO]\d{1,2}(?:\s*[,;]\s*[EO]\d{1,2})*)\]$/);
    if (!m) return [{ tipo: "texto", valor: p }];
    const ids = m[1].split(/\s*[,;]\s*/);
    if (!ids.every((id) => idsValidos.has(id))) return [{ tipo: "texto", valor: p }];
    return ids.flatMap((id, i) => (i ? [{ tipo: "texto", valor: " " }, { tipo: "ref", valor: id }] : [{ tipo: "ref", valor: id }]));
  }));
}

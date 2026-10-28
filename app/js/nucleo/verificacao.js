// Verificação da resposta gerada pela LLM contra as evidências fornecidas.
//
// Regras (todas automáticas, aplicadas antes de exibir qualquer conteúdo):
// 1. Toda afirmação deve citar ao menos uma evidência existente (E1…En).
// 2. Todo trecho entre \u00ab\u00bb ou aspas deve existir literalmente em uma das evidências
//    citadas pela afirmação; caso contrário a afirmação é removida.
// 3. A afirmação deve ter sobreposição mínima de vocabulário com as evidências citadas
//    (heurística de pertinência; não substitui revisão humana).
// 4. Afirmações que atribuem culpa ou antecipam julgamento são removidas.
// 5. Se nada restar, a resposta é substituída pelo reconhecimento de insuficiência.

import { normalizarComparacao, tokens } from "./texto.js";

export const SOBREPOSICAO_MINIMA = 0.34;

const JULGAMENTO = [
  /\b(cometeu|comete|praticou|incorreu em|incorre em)\b[^.]{0,40}\binfra[çc][ãa]o/i,
  /\b(é|e|foi|está|esta)\s+(culpad[oa]|infrator[a]?)\b/i,
  /\bdeve(rá|ra)?\s+ser\s+(punid[oa]|penalizad[oa]|cassad[oa]|advertid[oa])\b/i,
  /\bhouve\s+infra[çc][ãa]o\s+[ée]tica\b/i,
  /\bviol(a|ou|am|aram)\s+(o|ao|os)\s+(c[óo]digo|dispositivo|artigo|art\.)/i,
  /\b(configura|constitui|caracteriza|representa)(m|ram|ou)?\s+(uma\s+)?(clara\s+)?(infra[çc][ãa]o|viola[çc][ãa]o|falta\s+[ée]tica)/i,
  /\b(é|e|foi)\s+(uma\s+)?(infra[çc][ãa]o|viola[çc][ãa]o)\s+(ética|do\s+c[óo]digo)/i,
  // Juízo sobre a conduta narrada na pergunta ("a conduta descrita viola…", "o uso do cargo … viola")
  /\b(conduta|atitude|comportamento|uso\s+do\s+cargo|divulga[çc][ãa]o)\b[^.]{0,80}\bviol(a|ou)\b/i,
];

const RE_CITACAO = /\u00ab([^\u00bb]{4,})\u00bb|"([^"]{12,})"|\u201c([^\u201d]{12,})\u201d/g;

export function extrairCitacoes(texto) {
  const saida = [];
  for (const m of String(texto).matchAll(RE_CITACAO)) saida.push(m[1] || m[2] || m[3]);
  return saida;
}

// Literal, exceto por espaços, aspas tipográficas, reticências nas pontas e pela
// caixa da PRIMEIRA letra (convenção de citação: "[m]anter" ↔ "Manter").
export function citacaoPresente(citacao, fonte) {
  const c = normalizarComparacao(citacao).replace(/^[.…\s]+|[.…\s]+$/g, "");
  if (!c.length) return false;
  const f = normalizarComparacao(fonte);
  if (f.includes(c)) return true;
  const resto = c.slice(1);
  return resto.length > 0 && (f.includes(c[0].toLowerCase() + resto) || f.includes(c[0].toUpperCase() + resto));
}

function sobreposicao(afirmacao, textos) {
  const alvo = new Set(tokens(afirmacao));
  if (!alvo.size) return 0;
  const fonte = new Set(tokens(textos.join(" ")));
  let comum = 0;
  for (const t of alvo) if (fonte.has(t)) comum++;
  return comum / alvo.size;
}

export function contemJulgamento(texto) {
  return JULGAMENTO.some((re) => re.test(texto));
}

function textoDaEvidencia(e) {
  return [e.texto, ...e.contexto.map((c) => c.texto)].join(" ");
}

// Também vale citar o caput seguido da alínea/inciso, como se lê na norma
// ("É vedado ao/à assistente social depor como testemunha…"): o caput sem os dois
// pontos e o dispositivo sem a marca ("a-", "IV -"). Cada parte continua literal.
const RE_MARCA = /^\s*(?:[a-z]\s*[-–)]|[IVXLC]+\s*[-–.)]|§\s*\d+\s*[º°o]?\s*[-–.]?|Par[áa]grafo\s+\S+\s*[-–.:]?)\s*/;
function textosDaEvidencia(e) {
  const textos = [textoDaEvidencia(e)];
  if (e.contexto?.length) {
    const caput = e.contexto.map((c) => c.texto.replace(/[:\s]+$/, "")).join(" ");
    textos.push(`${caput} ${e.texto.replace(RE_MARCA, "")}`);
  }
  return textos;
}

export function verificarAfirmacao(afirmacao, porId) {
  const motivos = [];
  const ids = [...new Set((afirmacao.evidencias || []).map((x) => String(x).trim().toUpperCase()))];
  const evidencias = ids.map((id) => porId.get(id)).filter(Boolean);
  if (!ids.length) motivos.push("sem evidência indicada");
  if (ids.length && evidencias.length !== ids.length) motivos.push("cita evidência inexistente");
  const textos = evidencias.flatMap(textosDaEvidencia);
  for (const c of extrairCitacoes(afirmacao.texto)) {
    if (!textos.some((t) => citacaoPresente(c, t))) motivos.push(`trecho citado não encontrado literalmente: \u00ab${c.slice(0, 80)}\u00bb`);
  }
  if (evidencias.length) {
    const s = sobreposicao(afirmacao.texto, textos);
    if (s < SOBREPOSICAO_MINIMA) motivos.push(`baixa correspondência com as evidências citadas (${Math.round(s * 100)}%)`);
  }
  if (contemJulgamento(afirmacao.texto)) motivos.push("atribui culpa ou antecipa julgamento");
  // Apoiar-se em norma revogada/indicada como revogada exige dizê-lo expressamente.
  const inaplicaveis = evidencias.filter((e) => e.vigencia?.aplicavel === false);
  if (inaplicaveis.length && inaplicaveis.length === evidencias.length &&
      !/revog|suspens|invalid|hist[óo]ric|anterior|vigência|vigencia/i.test(afirmacao.texto)) {
    motivos.push("apoia-se apenas em norma revogada ou com indicação de revogação, sem sinalizar isso");
  }
  return { aceita: motivos.length === 0, motivos, evidencias: evidencias.map((e) => e.id) };
}

// `analise` é o JSON devolvido pela LLM (ver llm/prompt.js).
export function verificarAnalise(analise, evidencias) {
  const porId = new Map(evidencias.map((e) => [e.id, e]));
  const aceitas = [];
  const removidas = [];
  for (const a of analise?.afirmacoes || []) {
    if (!a || typeof a.texto !== "string" || !a.texto.trim()) continue;
    const v = verificarAfirmacao(a, porId);
    if (v.aceita) aceitas.push({ texto: a.texto.trim(), natureza: a.natureza === "interpretacao" ? "interpretacao" : "norma_expressa", evidencias: v.evidencias });
    else removidas.push({ texto: a.texto, motivos: v.motivos });
  }
  const atencao = [];
  for (const t of analise?.aspectos_atencao || []) {
    if (typeof t !== "string" || !t.trim()) continue;
    const citacoesOk = extrairCitacoes(t).every((c) => evidencias.some((e) => citacaoPresente(c, textoDaEvidencia(e))));
    if (citacoesOk && !contemJulgamento(t)) atencao.push(t.trim());
    else removidas.push({ texto: t, motivos: ["aspecto de atenção com citação não verificada ou julgamento"] });
  }
  let sintese = typeof analise?.sintese_questao === "string" ? analise.sintese_questao.trim() : "";
  if (sintese && (contemJulgamento(sintese) || extrairCitacoes(sintese).length)) {
    removidas.push({ texto: sintese, motivos: ["síntese com citação ou julgamento"] });
    sintese = "";
  }
  const usadas = new Set(aceitas.flatMap((a) => a.evidencias));
  return {
    sintese,
    afirmacoes: aceitas,
    aspectosAtencao: atencao,
    removidas,
    evidenciasUsadas: [...usadas],
    suficiente: aceitas.length > 0 && analise?.fundamentacao_suficiente !== false,
    lacunas: (analise?.lacunas || []).filter((x) => typeof x === "string" && !contemJulgamento(x)),
  };
}

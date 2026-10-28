// Normas citadas pelo nome ou número na pergunta ("Res. 559/2009", "Lei 8.662/93",
// "Código Processual de Ética"). Quem cita uma norma quer ler essa norma: a busca
// dá prioridade a ela, mesmo que esteja revogada (o aviso de vigência continua).

import { dobrarAcentos } from "./texto.js";

const NUM = String.raw`(\d{1,2}\.\d{3}|\d{2,5})`;
const ANO = String.raw`(?:\s*\/\s*(\d{4}|\d{2}))?`;
const RE_LEI = new RegExp(String.raw`\blei\s*(?:federal\s*)?(?:n[º°o.]*\s*)?` + NUM + ANO, "gi");
const RE_RES = new RegExp(String.raw`\b(?:resolu[cç][aã]o|res\.?)\s*(?:cfess\s*)?(?:n[º°o.]*\s*)?` + NUM + ANO, "gi");
const RE_ON = new RegExp(String.raw`\b(?:orienta[cç][aã]o\s+normativa|on)\s*(?:cfess\s*)?(?:n[º°o.]*\s*)?(\d{1,2})\s*\/\s*(\d{4}|\d{2})`, "gi");
// Número/ano solto ("a 559/2009 está válida?"), só com ano de 4 dígitos. Sem
// "lookbehind" (o Safari anterior ao iOS 16.4 não o aceita): o caractere anterior
// entra no grupo 1 e é ignorado.
const RE_SOLTO = /(^|[^\d./])(\d{1,2}\.\d{3}|\d{3,4})\s*\/\s*((?:19|20)\d{2})(?![\d/])/g;

const ano4 = (a) => (!a ? null : a.length === 4 ? +a : +a + (+a >= 50 ? 1900 : 2000));
const semPonto = (n) => String(n).replace(/\./g, "");

const PARTES_POR_EXPRESSAO = [
  [/codigo processual de etica/, (p) => /PROCESSUAL DE ÉTICA/i.test(p)],
  [/codigo processual disciplinar/, (p) => /PROCESSUAL DISCIPLINAR/i.test(p)],
  [/codigo de etica(?! processual)/, (p) => /^Código de Ética/.test(p)],
  [/lei de regulamentacao(?: da profissao)?/, (p) => /^Lei nº 8\.662/.test(p)],
];

export function normasCitadas(consulta, indice) {
  const docs = new Set();
  const partes = new Set();
  const texto = String(consulta);
  const plano = dobrarAcentos(texto.toLowerCase());
  const todasPartes = [...new Set(indice.unidades.map((u) => u.parte))];

  const porNumero = (n, a, tipos) => {
    for (const d of indice.documentos.values()) {
      if (!tipos.includes(d.tipo) || semPonto(d.numero) !== semPonto(n)) continue;
      if (a && d.ano !== a) continue;
      docs.add(d.id);
    }
  };
  for (const m of texto.matchAll(RE_LEI)) {
    const n = semPonto(m[1]);
    for (const p of todasPartes) if (/^Lei nº/.test(p) && semPonto(p).includes(` ${n}/`)) partes.add(p);
  }
  for (const m of texto.matchAll(RE_RES)) porNumero(m[1], ano4(m[2]), ["resolucao"]);
  for (const m of texto.matchAll(RE_ON)) porNumero(m[1], ano4(m[2]), ["orientacao_normativa"]);
  for (const m of texto.matchAll(RE_SOLTO)) porNumero(m[2], ano4(m[3]), ["resolucao", "orientacao_normativa"]);
  for (const [re, filtro] of PARTES_POR_EXPRESSAO) {
    if (re.test(plano)) for (const p of todasPartes) if (filtro(p)) partes.add(p);
  }
  return { docs, partes, alguma: docs.size > 0 || partes.size > 0 };
}

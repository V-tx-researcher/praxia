import { radicalSnowball } from "./snowball-pt.js";

// Normalização, tokenização e radicalização para português.
// Usado igualmente na indexação (no navegador) e nas consultas.

export const STOPWORDS = new Set((
  "a o e é os as de do da dos das em no na nos nas um uma uns umas por para pelo pela pelos pelas " +
  "com sem sob sobre entre ao aos à às que se ou como mas mais menos muito muita muitos muitas " +
  "este esta estes estas esse essa esses essas isso isto aquele aquela aquilo seu sua seus suas " +
  "meu minha meus minhas nosso nossa nossos nossas ele ela eles elas eu tu nós vós voce você vocês " +
  "lhe lhes me te nos vos já não sim também quando onde qual quais quem cujo cuja ser estar ter haver " +
  "foi são sao está esta estão estao tem têm há ha pode podem posso deve devem devo será sera seria " +
  "isso aqui ali lá la então entao assim porque pois caso sendo sido tendo sobre cada outro outra " +
  "outros outras mesmo mesma todo toda todos todas qualquer quaisquer algum alguma alguns algumas " +
  "art artigo inciso alinea alínea paragrafo parágrafo unico único " +
  // verbos auxiliares e palavras interrogativas frequentes nas perguntas
  "faço faco faz fazer fazem quero queria preciso precisa precisamos gostaria saber existe existem " +
  "ainda agora hoje sempre nunca certo correto verdade quanto quantos quantas qual quais como onde " +
  "devemos podemos posso pode podemos devo deve tenho temos tem ultimo última ultima último coisa"
).split(/\s+/));

export function dobrarAcentos(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const STOPWORDS_SEM_ACENTO = new Set([...STOPWORDS].map(dobrarAcentos));

// Radical de uma palavra (minúscula, com acentos): Snowball para português,
// precedido de uma uniformização de gênero em "-ia/-io" ("usuária"/"usuário",
// "estagiária"/"estagiário"), que o Snowball trataria como sufixo verbal.
// O resultado é comparado sem acentos.
export function radical(p) {
  let t = singular(p);
  if (/[^aeiouáéíóúâêô]ia$/.test(t)) t = t.slice(0, -1) + "o";
  return dobrarAcentos(radicalSnowball(t));
}

// Redução de plural nominal antes do Snowball, que trata "-ais" e "-ões" como
// sufixos verbais ("profissionais" ≠ "profissional", "atribuições" ≠ "atribuição").
function singular(t) {
  if (t.length <= 4) return t;
  if (/[õã]es$/.test(t)) return t.slice(0, -3) + "ão";
  if (/ais$/.test(t)) return t.slice(0, -3) + "al";
  if (/[^áé]eis$/.test(t)) return t.slice(0, -3) + "el";
  if (/óis$/.test(t)) return t.slice(0, -3) + "ol";
  if (/ns$/.test(t)) return t.slice(0, -2) + "m";
  if (/[rzl]es$/.test(t)) return t.slice(0, -2);
  if (/[aeiouéêóô]s$/.test(t)) return t.slice(0, -1);
  return t;
}

// Tokens normalizados (minúsculas, sem stopwords, radicalizados, sem acentos).
export function tokens(texto) {
  const saida = [];
  const brutos = String(texto).toLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+/gu) || [];
  for (const b of brutos) {
    if (b.length < 2 || STOPWORDS_SEM_ACENTO.has(dobrarAcentos(b))) continue;
    saida.push(/^\d+$/.test(b) ? b : radical(b));
  }
  return saida;
}

// Normalização usada na comparação literal de citações:
// apenas espaços e aspas tipográficas. Letras, acentos e pontuação são preservados.
export function normalizarComparacao(s) {
  return String(s)
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Radicalizador Snowball para português (algoritmo de Martin Porter, licença BSD).
// Implementação própria a partir da descrição pública do algoritmo:
// https://snowballstem.org/algorithms/portuguese/stemmer.html
// Recebe palavras em minúsculas, com acentos.

const VOGAIS = "aeiouáéíóúâêô";
const ehVogal = (c) => VOGAIS.includes(c);

const STEP1 = [
  // [sufixos, ação]
  [["amentos", "imentos", "amento", "imento", "adoras", "adores", "aço~es", "ismos", "istas", "adora", "aça~o",
    "antes", "ância", "ezas", "icos", "icas", "ismo", "ável", "ível", "ista", "osos", "osas", "ador", "ante",
    "eza", "ico", "ica", "oso", "osa"], "r2"],
  [["logias", "logia"], "log"],
  [["uço~es", "uça~o"], "u"],
  [["ências", "ência"], "ente"],
  [["amente"], "amente"],
  [["mente"], "mente"],
  [["idades", "idade"], "idade"],
  [["ivas", "ivos", "iva", "ivo"], "iva"],
  [["iras", "ira"], "ira"],
];

const STEP2 = [
  "aríamos", "eríamos", "iríamos", "ássemos", "êssemos", "íssemos", "aríeis", "eríeis", "iríeis",
  "ásseis", "ésseis", "ísseis", "áramos", "éramos", "íramos", "ávamos", "aremos", "eremos", "iremos",
  "ariam", "eriam", "iriam", "assem", "essem", "issem", "ara~o", "era~o", "ira~o", "arias", "erias",
  "irias", "ardes", "erdes", "irdes", "asses", "esses", "isses", "astes", "estes", "istes", "áreis",
  "areis", "éreis", "ereis", "íreis", "ireis", "áveis", "íamos", "armos", "ermos", "irmos",
  "aria", "eria", "iria", "asse", "esse", "isse", "aste", "este", "iste", "arei", "erei", "irei",
  "aram", "eram", "iram", "avam", "arem", "erem", "irem", "ando", "endo", "indo", "adas", "idas",
  "arás", "aras", "erás", "eras", "irás", "avas", "ares", "eres", "ires", "íeis", "ados", "idos",
  "ámos", "amos", "emos", "imos", "iras", "ada", "ida", "ará", "ara", "erá", "era", "irá", "ava",
  "iam", "ado", "ido", "ias", "ais", "eis", "ira", "ia", "ei", "am", "em", "ar", "er", "ir", "as",
  "es", "is", "eu", "iu", "ou",
];

const STEP4 = ["os", "a", "i", "o", "á", "í", "ó"];

function regioes(w) {
  const n = w.length;
  let r1 = n;
  let r2 = n;
  for (let i = 1; i < n; i++) {
    if (!ehVogal(w[i]) && ehVogal(w[i - 1])) { r1 = i + 1; break; }
  }
  for (let i = r1 + 1; i < n; i++) {
    if (!ehVogal(w[i]) && ehVogal(w[i - 1])) { r2 = i + 1; break; }
  }
  let rv = n;
  if (n >= 2) {
    if (!ehVogal(w[1])) {
      for (let i = 2; i < n; i++) if (ehVogal(w[i])) { rv = i + 1; break; }
    } else if (ehVogal(w[0]) && ehVogal(w[1])) {
      for (let i = 2; i < n; i++) if (!ehVogal(w[i])) { rv = i + 1; break; }
    } else {
      rv = 3;
    }
  }
  return { r1: Math.min(r1, n), r2: Math.min(r2, n), rv: Math.min(rv, n) };
}

const termina = (w, s) => w.endsWith(s);
const em = (w, s, inicioRegiao) => w.length - s.length >= inicioRegiao;

function passo1(w) {
  const { r1, r2, rv } = regioes(w);
  // Sufixo mais longo entre todos os grupos.
  let melhor = null;
  for (const [sufs, acao] of STEP1) {
    for (const s of sufs) if (termina(w, s) && (!melhor || s.length > melhor.s.length)) melhor = { s, acao };
  }
  if (!melhor) return null;
  const { s, acao } = melhor;
  const base = w.slice(0, -s.length);
  switch (acao) {
    case "r2": return em(w, s, r2) ? base : null;
    case "log": return em(w, s, r2) ? base + "log" : null;
    case "u": return em(w, s, r2) ? base + "u" : null;
    case "ente": return em(w, s, r2) ? base + "ente" : null;
    case "amente": {
      if (!em(w, s, r1)) return null;
      let b = base;
      const rg = regioes(w);
      if (b.endsWith("iv") && b.length - 2 >= rg.r2) {
        b = b.slice(0, -2);
        if (b.endsWith("at") && b.length - 2 >= rg.r2) b = b.slice(0, -2);
      } else {
        for (const p of ["os", "ic", "ad"]) if (b.endsWith(p) && b.length - 2 >= rg.r2) { b = b.slice(0, -2); break; }
      }
      return b;
    }
    case "mente": {
      if (!em(w, s, r2)) return null;
      let b = base;
      for (const p of ["ante", "avel", "ível"]) if (b.endsWith(p) && b.length - p.length >= r2) { b = b.slice(0, -p.length); break; }
      return b;
    }
    case "idade": {
      if (!em(w, s, r2)) return null;
      let b = base;
      for (const p of ["abil", "ic", "iv"]) if (b.endsWith(p) && b.length - p.length >= r2) { b = b.slice(0, -p.length); break; }
      return b;
    }
    case "iva": {
      if (!em(w, s, r2)) return null;
      let b = base;
      if (b.endsWith("at") && b.length - 2 >= r2) b = b.slice(0, -2);
      return b;
    }
    case "ira":
      return em(w, s, rv) && base.endsWith("e") ? base + "ir" : null;
    default:
      return null;
  }
}

function passo2(w) {
  const { rv } = regioes(w);
  for (const s of STEP2) if (termina(w, s) && em(w, s, rv)) return w.slice(0, -s.length);
  return null;
}

export function radicalSnowball(palavra) {
  let w = palavra.replace(/ã/g, "a~").replace(/õ/g, "o~");
  let alterou = false;
  const p1 = passo1(w);
  if (p1 !== null) {
    w = p1;
    alterou = true;
  } else {
    const p2 = passo2(w);
    if (p2 !== null) { w = p2; alterou = true; }
  }
  if (alterou) {
    const { rv } = regioes(w);
    if (w.endsWith("ci") && w.length - 1 >= rv) w = w.slice(0, -1);
  } else {
    const { rv } = regioes(w);
    for (const s of STEP4) if (w.endsWith(s) && em(w, s, rv)) { w = w.slice(0, -s.length); break; }
  }
  {
    const { rv } = regioes(w);
    const ultimo = w.slice(-1);
    if (["e", "é", "ê"].includes(ultimo) && w.length - 1 >= rv) {
      w = w.slice(0, -1);
      const r = regioes(w);
      if ((w.endsWith("gu") || w.endsWith("ci")) && w.length - 1 >= r.rv) w = w.slice(0, -1);
    } else if (w.endsWith("ç")) {
      w = w.slice(0, -1) + "c";
    }
  }
  return w.replace(/a~/g, "ã").replace(/o~/g, "õ");
}

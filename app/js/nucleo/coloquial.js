// Perguntas informais (D55): profissionais escrevem como no WhatsApp ("qr", "oq", "zap", "kkk").
// Antes da busca, a pergunta é normalizada e ganha os termos que as normas usam para o mesmo assunto.
// Só afeta a busca: a pergunta exibida e enviada à IA continua a original.

// Abreviações trocadas palavra a palavra (sem expressão regular com limite de palavra, que no JavaScript
// não reconhece letras acentuadas e trocaria o "n" de "número").
const ABREVIACOES = new Map(Object.entries({
  qr: "quer", q: "que", oq: "o que", vc: "você", vcs: "vocês", pq: "porque", to: "estou", ta: "está",
  pra: "para", pro: "para o", tb: "também", tbm: "também", n: "não", mto: "muito", mt: "muito", hj: "hoje",
  "c/": "com", "s/": "sem", blz: "", msg: "mensagem", rs: "", rsrs: "",
}));
const RISO = /^(k{2,}|(?:rs)+|ha(?:ha)+)$/i;

// Assunto do dia a dia → termos das normas (acrescentados, nunca substituem o que a pessoa escreveu).
const ASSUNTOS = [
  [/\b(zap|whats\w*|wpp|video ?chamada|chamada de v[ií]deo|online|on-line|remot\w*|meet|teams|liga[cç][aã]o)\b/i,
    "atendimento remoto meios tecnológicos teletrabalho"],
  [/\b(carro|transporte|ve[ií]culo|seguran[cç]a|perigo\w*|risco)\b/i, "condições éticas e técnicas do exercício profissional"],
  [/\b(cobrar|particular|consult[oó]rio|aut[oô]nom\w*|honor[aá]rio\w*|pre[cç]o)\b/i, "exercício autônomo honorários"],
  [/\b(prazo|dias|urgente|correria|press[aã]o)\b/i, "autonomia técnica condições de trabalho prazo"],
  [/\b(recusar|recuso|negar|nego|n[aã]o fazer|me negar)\b/i, "recusa direito do assistente social autonomia"],
  [/\bassin\w*/i, "assinar documento técnico atribuição privativa"],
  [/\b(psic[oó]log\w*|enfermeir\w*|m[eé]dic\w*|pedagog\w*)\b/i, "outros profissionais equipe multiprofissional"],
  [/\b(ass[eé]dio|humilha\w*|perseg\w*|grit\w*)\b/i, "assédio moral condições de trabalho denúncia"],
  [/\b(demiss\w*|demit\w*|sal[aá]rio|carteira assinada|clt|contrato)\b/i, "relação de trabalho empregador"],
  [/\b(abre|abriu|mexe|mexeu|fu[cç]a|olha|v[eê]) (meus|os) (arquivos|pap[eé]is|documentos|prontu[aá]rios)\b/i,
    "acesso ao material técnico sigiloso inviolabilidade"],
];

export function normalizarColoquial(texto) {
  const t = String(texto).split(/\s+/).map((w) => {
    const m = w.match(/^([^\p{L}\d/]*)([\p{L}\d/]+)([^\p{L}\d]*)$/u);
    if (!m) return w;
    const chave = m[2].toLowerCase();
    if (RISO.test(chave)) return m[3];
    return ABREVIACOES.has(chave) ? m[1] + ABREVIACOES.get(chave) + m[3] : w;
  }).join(" ");
  const extras = ASSUNTOS.filter(([re]) => re.test(t)).map(([, termos]) => termos);
  return (t + (extras.length ? ` ${extras.join(" ")}` : "")).replace(/[?!]{2,}/g, "?").replace(/\s+/g, " ").trim();
}

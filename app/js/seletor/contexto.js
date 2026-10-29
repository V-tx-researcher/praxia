// Ajuste contextual do seletor (configuração C, validada em tests/seletor/validacao/): não altera engine.js
// nem data.js. (1) Normaliza abreviações comuns e reduz palavras a um radical de 6 letras, na pergunta e nas
// intenções; (2) retira do banco de sugestões as sondas de teste Q107–Q115 (perguntas fora do escopo, dados
// pessoais e tentativas de injeção), que não são dúvidas para sugerir ao usuário; (3) limiar 0,30.
(function (root) {
  "use strict";
  const SONDAS = new Set(["Q107", "Q108", "Q109", "Q110", "Q111", "Q112", "Q113", "Q114", "Q115"]);
  const ABREV = { as: "assistente social", hrs: "horas", hr: "horas", h: "horas", qnd: "quando", qto: "quanto", qm: "quem", q: "que",
    pra: "para", pro: "para o", ta: "esta", to: "estou", info: "informacoes", multi: "multidisciplinar", trampo: "trabalho", carteirinha: "carteira" };
  const LIMIAR = 0.30;
  function norm(clean, t) {
    return clean(t).split(" ").flatMap((w) => (ABREV[w] || w).split(" ")).map((w) => (w.length > 6 ? w.slice(0, 6) : w)).join(" ");
  }
  let cache = null;
  function sugerir(S, intents, variants, pergunta) {
    if (!cache || cache.fonte !== intents) {
      cache = { fonte: intents, base: intents.filter((x) => !SONDAS.has(x.id)).map((x) => ({ ...x, q_orig: x.q, q: norm(S.clean, x.q) })) };
    }
    return S.suggest(norm(S.clean, pergunta), cache.base, variants, { threshold: LIMIAR, limit: 3, useUnreviewedVariants: false })
      .map((r) => ({ ...r, q: r.q_orig }));
  }
  const api = { SONDAS, ABREV, LIMIAR, norm, sugerir };
  root.PraxiaSelectorContexto = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

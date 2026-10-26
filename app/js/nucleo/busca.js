// Recuperação lexical (BM25) sobre as unidades do acervo, com expansão de
// consulta, pesos por tipo de unidade e contexto hierárquico.

import { tokens } from "./texto.js";
import { expandir, relacionados } from "./sinonimos.js";

const K1 = 1.2;
const B = 0.75;
const PESO_EXPANSAO = 0.45;
const PESO_HIERARQUIA = 0.6;
const PESO_CONTEXTO = 0.5;
const IDF_INFORMATIVO = 0.8;
// Documento que o portal oficial indica como revogado/invalidado/suspenso (não conferido).
const PESO_INDICACAO_PORTAL = 0.55;

// Peso por natureza da unidade: texto normativo prevalece sobre apresentação.
const PESO_TIPO = {
  artigo: 1.0, paragrafo: 1.0, inciso: 1.0, alinea: 1.0, principio: 1.0,
  trecho: 0.85, apresentacao: 0.55,
};

const PESO_SITUACAO = {
  vigente_confirmada: 1.0, alterada: 1.0, nao_verificada: 0.95, historica: 0.6, revogada: 0.5,
};

export class IndiceLexical {
  constructor(acervo) {
    this.documentos = new Map(acervo.documentos.map((d) => [d.id, d]));
    this.unidades = acervo.unidades;
    this.porId = new Map(this.unidades.map((u) => [u.id, u]));
    this.filhos = new Map();
    for (const u of this.unidades) {
      if (u.pai) {
        if (!this.filhos.has(u.pai)) this.filhos.set(u.pai, []);
        this.filhos.get(u.pai).push(u.id);
      }
    }
    this.tf = [];
    this.comprimento = [];
    this.df = new Map();
    for (const u of this.unidades) {
      // Texto pesquisável: o próprio dispositivo, sua hierarquia e o caput do qual depende
      // (ex.: "É vedado ao/à assistente social:" para cada alínea do Art. 4º).
      const pai = u.pai ? this.porId.get(u.pai) : null;
      const avo = pai && pai.pai ? this.porId.get(pai.pai) : null;
      // O texto do próprio dispositivo pesa 1; o contexto herdado pesa menos, para que
      // todas as alíneas de um mesmo caput não empatem pelo caput.
      const campos = [
        [tokens(u.texto), 1],
        [tokens([u.rotulo, u.parte, ...(u.hierarquia || [])].join(" ")), PESO_HIERARQUIA],
        [tokens([pai ? pai.texto : "", avo ? avo.texto : ""].join(" ")), PESO_CONTEXTO],
      ];
      const contagem = new Map();
      let comprimento = 0;
      for (const [toks, peso] of campos) {
        comprimento += toks.length * peso;
        for (const t of toks) contagem.set(t, (contagem.get(t) || 0) + peso);
      }
      this.tf.push(contagem);
      this.comprimento.push(comprimento);
      for (const t of contagem.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.n = this.unidades.length;
    this.media = this.comprimento.reduce((a, b) => a + b, 0) / Math.max(1, this.n);
  }

  idf(t) {
    const df = this.df.get(t) || 0;
    return Math.log(1 + (this.n - df + 0.5) / (df + 0.5));
  }

  pontuar(i, termos) {
    const tf = this.tf[i];
    const len = this.comprimento[i];
    let s = 0;
    const casados = [];
    for (const [t, peso] of termos) {
      const f = tf.get(t);
      if (!f) continue;
      casados.push(t);
      s += peso * this.idf(t) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * len) / this.media)));
    }
    return { s, casados };
  }

  // Retorna unidades ordenadas por relevância, com os termos que casaram.
  buscar(consulta, { limite = 30, filtroDoc = null } = {}) {
    const originais = [...new Set(tokens(consulta))];
    // Palavra digitada correspondente a cada radical, para exibição ao usuário.
    const superficie = new Map();
    for (const palavra of String(consulta).split(/[^\p{L}\p{N}]+/u)) {
      const t = tokens(palavra)[0];
      if (t && !superficie.has(t)) superficie.set(t, palavra.toLowerCase());
    }
    if (!originais.length) return { termos: [], resultados: [] };
    const termos = new Map(originais.map((t) => [t, 1]));
    for (const e of expandir(originais)) if (!termos.has(e)) termos.set(e, PESO_EXPANSAO);
    // Termos informativos: os que não aparecem em quase todo o acervo (ex.: "assistente",
    // "social"). Só eles contam para decidir se um dispositivo é pertinente.
    const informativos = new Set(originais.filter((t) => this.idf(t) >= IDF_INFORMATIVO));
    const resultados = [];
    for (let i = 0; i < this.n; i++) {
      const u = this.unidades[i];
      if (filtroDoc && !filtroDoc(this.documentos.get(u.doc))) continue;
      const { s, casados } = this.pontuar(i, termos);
      if (s <= 0) continue;
      const diretos = casados.filter((t) => informativos.has(t)).length;
      if (!diretos) continue; // sinônimos ou termos genéricos sozinhos não bastam
      // Cobertura: fração dos termos informativos da pergunta contemplada pelo dispositivo,
      // diretamente (peso 1) ou por termo relacionado do tesauro (peso 0,6).
      const conjunto = new Set(casados);
      let cobertos = 0;
      let informativosCasados = 0;
      for (const t of informativos) {
        if (conjunto.has(t)) { cobertos += 1; informativosCasados++; }
        else if (relacionados(t).some((r) => conjunto.has(r))) { cobertos += 0.6; informativosCasados++; }
      }
      const cobertura = cobertos / informativos.size;
      const doc = this.documentos.get(u.doc);
      const fator = (PESO_TIPO[u.tipo] ?? 0.8) * (PESO_SITUACAO[doc?.situacao] ?? 0.9) *
        (doc?.indicacoes_portal?.length ? PESO_INDICACAO_PORTAL : 1);
      const palavras = casados.filter((t) => informativos.has(t) && superficie.has(t)).map((t) => superficie.get(t));
      resultados.push({ unidade: u, pontuacao: s * fator * (0.6 + 0.4 * cobertura), casados: palavras,
        porSinonimo: casados.some((t) => termos.get(t) < 1), cobertura, informativosCasados });
    }
    resultados.sort((a, b) => b.pontuacao - a.pontuacao);
    return { termos: originais, informativos: [...informativos],
      expandidos: [...termos.keys()].filter((t) => termos.get(t) < 1), resultados: resultados.slice(0, limite) };
  }

  cadeiaDeContexto(id) {
    const cadeia = [];
    let u = this.porId.get(id);
    while (u && u.pai) {
      u = this.porId.get(u.pai);
      if (u) cadeia.unshift(u);
    }
    return cadeia;
  }
}

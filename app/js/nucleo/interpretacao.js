// Camada 2 (D41): orientações institucionais do CFESS, dos CRESS e da ABEPSS (cartilhas,
// notas técnicas, pareceres jurídicos, parâmetros de atuação, Política Nacional de Estágio).
// Ficam num índice próprio, separado das normas: nunca fundamentam "o que a norma
// estabelece". Servem para explicar como as entidades interpretam e aplicam as normas,
// sempre com a fonte identificada. Os trechos são literais, como os das normas.

import { linkPdf, rotuloLocalizacao } from "./evidencias.js";

const MAX_ORIENTACOES = 3;
const POR_DOCUMENTO = 1; // variedade de fontes: um trecho por publicação
const LIMIAR_RELATIVO = 0.45;
// Exigência maior que a das normas: orientação só entra se tratar de fato do assunto.
const COBERTURA_MINIMA = 0.6;

export const SITUACAO_ORIENTACAO = "orientacao_institucional";

// Trecho que só transcreve dispositivos (as cartilhas reproduzem o Código e as
// resoluções, às vezes em redação antiga): repete a norma sem explicar nada.
const RE_DISPOSITIVO = /(?:^|\s)(?:Art\.?\s*\d+|Par[áa]grafo [úu]nico|§\s*\d+|[a-z]\)\s|[IVX]+\s*[-–]\s)/g;
export function transcreveNorma(texto) {
  const marcas = texto.match(RE_DISPOSITIVO)?.length || 0;
  return /^[\s“"«]*(?:Art\.?\s*\d|Par[áa]grafo|§|[a-z]\s*[-–)]\s|[IVX]+\s*[-–]\s)/.test(texto) || marcas >= 3;
}

export function selecionarOrientacoes(indice, pergunta, { max = MAX_ORIENTACOES } = {}) {
  if (!indice?.n) return [];
  const { resultados } = indice.buscar(pergunta, { limite: 80 });
  const validos = resultados.filter((r) => (r.cobertura >= COBERTURA_MINIMA && (r.informativosCasados ?? 0) >= 2 ||
    r.cobertura >= 0.99) && !transcreveNorma(r.unidade.texto));
  if (!validos.length) return [];
  const melhor = validos[0].pontuacao;
  const porDoc = new Map();
  const escolhidos = [];
  for (const r of validos) {
    if (r.pontuacao < melhor * LIMIAR_RELATIVO) break;
    const n = porDoc.get(r.unidade.doc) || 0;
    if (n >= POR_DOCUMENTO) continue;
    porDoc.set(r.unidade.doc, n + 1);
    escolhidos.push(r);
    if (escolhidos.length >= max) break;
  }
  return escolhidos.map((r, i) => montarOrientacao(indice, r, i + 1));
}

export function montarOrientacao(indice, resultado, n) {
  const u = resultado.unidade;
  const doc = indice.documentos.get(u.doc);
  return {
    id: `O${n}`,
    camada: 2,
    unidadeId: u.id,
    documento: {
      id: doc.id, titulo: doc.titulo, tipo: doc.tipo_rotulo, orgao: doc.orgao, numero: null, ano: doc.ano,
      situacao: SITUACAO_ORIENTACAO, situacaoRotulo: doc.situacao_rotulo, conferido: doc.conferido,
      fonteOficial: doc.fonte_oficial_url, sha256: doc.sha256, referencia: doc.referencia, autoria: doc.autoria,
    },
    parte: u.parte,
    parteTipo: u.parte_tipo,
    tipo: u.tipo,
    rotulo: u.rotulo,
    hierarquia: [],
    localizacao: rotuloLocalizacao(doc, u),
    pagina: u.pagina,
    texto: u.texto,
    situacaoDispositivo: null,
    notaDispositivo: null,
    contexto: [],
    link: linkPdf(doc, u),
    termosCasados: resultado.casados,
    porSinonimo: !!resultado.porSinonimo,
    porSentido: false,
    pontuacao: resultado.pontuacao,
    cobertura: resultado.cobertura ?? null,
    notaVigencia: doc.nota_vigencia || null,
    vigencia: { aplicavel: true, avisos: doc.nota_vigencia ? [doc.nota_vigencia] : [] },
  };
}

// Mesmo cuidado das normas: o texto exibido continua idêntico ao do índice.
export function conferirOrientacoes(indice, orientacoes) {
  return orientacoes.filter((o) => indice?.porId.get(o.unidadeId)?.texto === o.texto);
}

// Afirmação apoiada só em orientações não pode ser apresentada como norma expressa.
export function ajustarNatureza(afirmacoes, porId) {
  for (const a of afirmacoes) {
    const camadas = a.evidencias.map((id) => porId.get(id)?.camada || 1);
    if (camadas.length && camadas.every((c) => c === 2)) a.natureza = "orientacao";
    else if (a.natureza === "norma_expressa" && !camadas.includes(1)) a.natureza = "interpretacao";
  }
  return afirmacoes;
}

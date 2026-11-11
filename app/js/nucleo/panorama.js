// Panorama exaustivo (D52): todos os documentos do acervo que tratam da pergunta, agrupados por
// categoria (lei, Código de Ética, resoluções, notas técnicas…), e não só os 8 trechos principais.
// Três fontes de documentos:
//   1. a busca ampla (todos os dispositivos acima de um limiar baixo, um trecho por documento);
//   2. as normas citadas DENTRO dos trechos encontrados (ex.: um artigo que remete à Res. 493/2006);
//   3. as orientações institucionais (camada 2: notas técnicas, pareceres, cartilhas).
// Documentos revogados ou suspensos nunca entram nas categorias: ficam em "contexto histórico".

import { avaliarVigencia } from "./vigencia.js";
import { CATEGORIAS, categoriaDe } from "./categorias.js";
import { normasCitadas } from "./normas-citadas.js";

const LIMIAR_RELATIVO = 0.15;
const COBERTURA_MINIMA = 0.34;
export const MAX_POR_CATEGORIA = 12;

function aceitavel(r, melhor, citadas) {
  if (citadas?.docs?.has(r.unidade.doc) || citadas?.partes?.has(r.unidade.parte)) return true;
  if (r.pontuacao < melhor * LIMIAR_RELATIVO) return false;
  return r.porSentido || r.cobertura >= COBERTURA_MINIMA || (r.informativosCasados ?? 0) >= 2;
}

function item(indice, u, origem, dataFatos, camada) {
  const doc = indice.documentos.get(u.doc);
  const vig = camada === 2 ? { aplicavel: true, avisos: [] } : avaliarVigencia(doc, dataFatos, u);
  const documento = { id: doc.id, titulo: doc.titulo, tipo: doc.tipo_rotulo, tipoId: doc.tipo, orgao: doc.orgao,
    numero: doc.numero ?? null, ano: doc.ano ?? null, situacao: doc.situacao, situacaoRotulo: doc.situacao_rotulo,
    conferido: doc.conferido, fonteOficial: doc.fonte_oficial_url };
  const link = doc.arquivo_url ? (u.pagina ? `${doc.arquivo_url}#page=${u.pagina}` : doc.arquivo_url) : doc.fonte_oficial_url;
  return { chave: `${camada}|${doc.id}|${u.parte || ""}`, documento, parte: u.parte, unidadeId: u.id, rotulo: u.rotulo,
    pagina: u.pagina, texto: u.texto, link, origem, camada, vigencia: vig,
    emVigor: vig.aplicavel !== false && u.situacao_dispositivo !== "revogado" };
}

// Uma entrada por documento (ou por parte, em compilações como o livreto do Código de Ética com as leis).
function agregar(indice, resultados, origem, dataFatos, camada, citadas, mapa) {
  if (!resultados?.length) return;
  const melhor = resultados[0].pontuacao;
  for (const r of resultados) {
    if (!aceitavel(r, melhor, citadas)) continue;
    const it = item(indice, r.unidade, origem, dataFatos, camada);
    if (!mapa.has(it.chave)) mapa.set(it.chave, { ...it, pontuacao: r.pontuacao });
  }
}

// Normas que os próprios trechos encontrados citam ("conforme a Resolução CFESS nº 493/2006").
function citadasNosTrechos(indice, evidencias, dataFatos, mapa) {
  for (const e of evidencias) {
    const c = normasCitadas(e.texto, indice);
    for (const docId of c.docs) {
      if (docId === e.documento.id) continue;
      const u = indice.unidades.find((x) => x.doc === docId);
      if (!u) continue;
      const it = item(indice, u, `citada em ${e.id}`, dataFatos, 1);
      if (!mapa.has(it.chave)) mapa.set(it.chave, { ...it, pontuacao: 0 });
    }
  }
}

export function montarPanorama(indice, busca, evidencias, { interpretacao = null, pergunta = "", dataFatos = null } = {}) {
  const mapa = new Map();
  agregar(indice, busca?.resultados, "trata do tema", dataFatos, 1, busca?.citadas, mapa);
  citadasNosTrechos(indice, evidencias, dataFatos, mapa);
  if (interpretacao?.n && pergunta && evidencias.length) {
    const b2 = interpretacao.buscar(pergunta, { limite: 150 });
    agregar(interpretacao, b2.resultados, "orienta sobre o tema", dataFatos, 2, null, mapa);
  }
  const vigentes = [];
  const historico = [];
  for (const it of mapa.values()) (it.emVigor ? vigentes : historico).push(it);
  const grupos = new Map();
  for (const it of vigentes) {
    const c = categoriaDe(it.documento, it.parte);
    if (!grupos.has(c.id)) grupos.set(c.id, []);
    grupos.get(c.id).push(it);
  }
  const categorias = CATEGORIAS.filter((c) => grupos.has(c.id)).map((c) => {
    const docs = grupos.get(c.id).sort((a, b) => b.pontuacao - a.pontuacao);
    return { categoria: c, documentos: docs.slice(0, MAX_POR_CATEGORIA), omitidos: Math.max(0, docs.length - MAX_POR_CATEGORIA) };
  });
  const semResultado = CATEGORIAS.filter((c) => c.id !== "outro" && !grupos.has(c.id)).map((c) => c.rotulo);
  return { categorias, historico: historico.sort((a, b) => b.pontuacao - a.pontuacao),
    total: vigentes.length, semResultado };
}

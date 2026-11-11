// Modo Bússola (D54): quem faz o quê. Para a situação relatada, reúne os dispositivos oficiais
// sobre as competências do CFESS, do CRESS e das comissões (COFI, SubCOFI, Comissão Permanente
// de Ética, desagravo…) — Lei 8.662/1993, Política Nacional de Fiscalização (Res. 512/2007),
// Códigos Processuais de Ética e Disciplinar — junto com os trechos ligados à própria pergunta.
// A IA usa esses trechos para dizer o que cabe a cada instituição e SEMPRE o que o CRESS pode fazer.

import { montarEvidencia } from "./evidencias.js";
import { montarOrientacao } from "./interpretacao.js";
import { normalizarColoquial } from "./coloquial.js";

export const TERMOS_COMPETENCIA =
  "competência atribuição do Conselho Regional CRESS CFESS fiscalização orientação Comissão de Orientação e Fiscalização COFI " +
  "seccional denúncia representação processo ético Comissão Permanente de Ética desagravo defesa da profissão";

const PARTES_COMPETENCIA = [/^Lei nº 8\.662/, /Política Nacional de Fiscalização/, /PROCESSUAL DE ÉTICA/i, /PROCESSUAL DISCIPLINAR/i, /512\/2007/];
const ehCompetencia = (u) => PARTES_COMPETENCIA.some((re) => re.test(u.parte || "")) || /512-2007/.test(u.doc);

export const MAX_BUSSOLA = 20;

export function fontesBussola(indice, interpretacao, perguntaOriginal, evidencias = [], { max = MAX_BUSSOLA } = {}) {
  const pergunta = normalizarColoquial(perguntaOriginal);
  const lista = [];
  const vistos = new Set();
  const por = (e) => { if (!vistos.has(e.unidadeId) && lista.length < max) { vistos.add(e.unidadeId); lista.push(e); } };
  // 1. O que a pergunta trata (até 6 trechos principais/relacionados).
  for (const e of evidencias.filter((x) => x.prioridade !== "complementar").slice(0, 6)) por(e);
  // 2. Competências: busca combinando a pergunta com os termos de competência, só nas partes institucionais.
  let n = 0;
  const comp = indice.buscar(`${pergunta} ${TERMOS_COMPETENCIA}`, { limite: 400 }).resultados
    .filter((r) => ehCompetencia(r.unidade) && r.unidade.situacao_dispositivo !== "revogado");
  // No máximo 3 dispositivos por norma, para cobrir Lei 8.662, fiscalização, ética e disciplina.
  const porParte = new Map();
  for (const r of comp) {
    const k = r.unidade.parte || r.unidade.doc;
    if ((porParte.get(k) || 0) >= 3) continue;
    porParte.set(k, (porParte.get(k) || 0) + 1);
    por(montarEvidencia(indice, r, 0, null));
    if (lista.length >= max - 4) break;
  }
  // 3. Orientações das entidades sobre fiscalização e competências (camada 2).
  if (interpretacao?.n) {
    const b2 = interpretacao.buscar(`${pergunta} ${TERMOS_COMPETENCIA}`, { limite: 60 }).resultados;
    for (const r of b2.slice(0, 4)) por(montarOrientacao(interpretacao, r, 0));
  }
  // Identificadores próprios (B1, B2…) para a IA citar sem confundir com os da Biblioteca.
  return lista.map((e) => ({ ...e, id: `B${++n}` }));
}

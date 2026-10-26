// Seleção e montagem das evidências documentais a partir dos resultados da busca.
// O texto de cada evidência é copiado do acervo, nunca gerado: a LLM recebe as
// evidências prontas e só pode referir-se a elas pelo identificador (E1, E2…).

import { avaliarVigencia } from "./vigencia.js";

const LIMIAR_RELATIVO = 0.32; // fração da melhor pontuação abaixo da qual o resultado é descartado
const MAX_EVIDENCIAS = 8;
const COBERTURA_MINIMA = 0.4;

export function linkPdf(doc, unidade) {
  if (!doc.arquivo_url) return doc.fonte_oficial_url;
  return unidade?.pagina ? `${doc.arquivo_url}#page=${unidade.pagina}` : doc.arquivo_url;
}

export function rotuloLocalizacao(doc, unidade) {
  const partes = [];
  const parte = doc.partes?.find((p) => p.rotulo === unidade.parte);
  // Em compilações (ex.: Código de Ética + Lei 8.662/93 no mesmo arquivo) o nome da parte
  // identifica o texto normativo; em documentos simples, o título do documento basta.
  if (parte && doc.partes.length > 1) partes.push(unidade.parte);
  if (!["trecho", "apresentacao"].includes(unidade.tipo)) partes.push(unidade.rotulo);
  const pag = unidade.pagina_impressa
    ? `p. ${unidade.pagina_impressa} do impresso (p. ${unidade.pagina} do PDF)`
    : `p. ${unidade.pagina} do PDF`;
  partes.push(pag);
  return partes.join(", ");
}

export function selecionarEvidencias(indice, resultadoBusca, { dataFatos = null, max = MAX_EVIDENCIAS } = {}) {
  const res = resultadoBusca.resultados;
  if (!res.length) return [];
  // Suficiência mínima: o melhor dispositivo precisa contemplar boa parte dos termos
  // informativos da pergunta, ou ao menos dois deles. Caso contrário, a resposta
  // reconhece que o acervo não traz base suficiente.
  const topo = res.reduce((a, b) => (b.cobertura > a.cobertura ? b : a), res[0]);
  if (topo.cobertura < COBERTURA_MINIMA && (topo.informativosCasados ?? 0) < 2) return [];
  const melhor = res[0].pontuacao;
  const escolhidos = [];
  const cobertos = new Set();
  for (const r of res) {
    if (r.pontuacao < melhor * LIMIAR_RELATIVO) break;
    const u = r.unidade;
    if (cobertos.has(u.id)) continue;
    // Se o dispositivo-pai (caput) já foi escolhido, a alínea entra como complemento dele.
    escolhidos.push(r);
    cobertos.add(u.id);
    if (escolhidos.length >= max) break;
  }
  return escolhidos.map((r, i) => montarEvidencia(indice, r, i + 1, dataFatos));
}

export function montarEvidencia(indice, resultado, n, dataFatos) {
  const u = resultado.unidade;
  const doc = indice.documentos.get(u.doc);
  const contexto = indice.cadeiaDeContexto(u.id).map((c) => ({ id: c.id, rotulo: c.rotulo, texto: c.texto }));
  const vig = avaliarVigencia(doc, dataFatos);
  return {
    id: `E${n}`,
    unidadeId: u.id,
    documento: {
      id: doc.id, titulo: doc.titulo, tipo: doc.tipo_rotulo, orgao: doc.orgao, numero: doc.numero, ano: doc.ano,
      situacao: doc.situacao, situacaoRotulo: doc.situacao_rotulo, conferido: doc.conferido,
      fonteOficial: doc.fonte_oficial_url, sha256: doc.sha256,
    },
    parte: u.parte,
    parteTipo: u.parte_tipo,
    tipo: u.tipo,
    rotulo: u.rotulo,
    hierarquia: u.hierarquia,
    localizacao: rotuloLocalizacao(doc, u),
    pagina: u.pagina,
    texto: u.texto, // literal do acervo
    contexto,       // caput e níveis superiores, também literais
    link: linkPdf(doc, u),
    termosCasados: resultado.casados,
    porSinonimo: !!resultado.porSinonimo,
    pontuacao: resultado.pontuacao,
    vigencia: vig,
  };
}

// Garante que o texto exibido de cada evidência continua idêntico ao do acervo.
export function conferirEvidencias(indice, evidencias) {
  return evidencias.filter((e) => {
    const u = indice.porId.get(e.unidadeId);
    if (!u || u.texto !== e.texto) return false;
    return e.contexto.every((c) => indice.porId.get(c.id)?.texto === c.texto);
  });
}

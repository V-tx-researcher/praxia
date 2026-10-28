// Literatura crítica sobre as normas (camada 3, D40): artigos, dissertações, teses e
// publicações institucionais de acesso aberto que discutem as normas do acervo.
// Só indica a leitura (referência, resumo de triagem e link). Não é norma, não entra nas
// evidências e nunca vai para o contexto da IA.

import { dobrarAcentos } from "./texto.js";

export const POSICOES = {
  favoravel: "Em defesa da norma",
  critica: "Análise crítica",
  divergente: "Posição divergente",
  historica: "Histórica",
  descritiva: "Descritiva ou orientativa",
};

export const TIPOS_LEITURA = {
  artigo: "Artigo",
  dissertacao: "Dissertação",
  tese: "Tese",
  livro: "Livro",
  capitulo: "Capítulo de livro",
  publicacao_institucional: "Publicação institucional",
};

// O livreto do Código de Ética traz também as Leis 8.662/1993 e 12.317/2010: no acervo,
// os dispositivos dessas leis são unidades do documento do Código.
const LEIS_NO_CODIGO = { "8.662": "lei-8662", "8662": "lei-8662", "12.317": "lei-12317", "12317": "lei-12317" };

export function chaveNorma(docId, unidade = null) {
  const lei = /^Lei nº ([\d.]+)/.exec(unidade?.parte || "");
  if (lei && LEIS_NO_CODIGO[lei[1]]) return LEIS_NO_CODIGO[lei[1]];
  return docId;
}

// Chaves de norma que correspondem a um documento do acervo.
export function chavesDoDocumento(docId) {
  return docId === "cfess-codigo-etica-1993" ? [docId, "lei-8662", "lei-12317"] : [docId];
}

export function leiturasDoDocumento(literatura, docId) {
  const chaves = chavesDoDocumento(docId);
  return (literatura?.itens || []).filter((i) => i.normas.some((n) => chaves.includes(n)));
}

// Raízes de 5 letras ("sigilosas" e "sigilo" -> "sigil"), sem as palavras que aparecem em
// quase todo título da área e não ajudam a distinguir um texto de outro.
const COMUNS = new Set(["servi", "socia", "assis", "profi", "brasi", "etica", "codig", "norma", "sobre", "entre", "parti"]);

function palavras(texto) {
  return new Set(dobrarAcentos(String(texto).toLowerCase()).split(/[^a-z0-9]+/)
    .filter((p) => p.length > 4).map((p) => p.slice(0, 5)).filter((p) => !COMUNS.has(p)));
}

// Sugestões de leitura para uma resposta: textos que discutem as normas das evidências,
// pesando a prioridade da evidência (principal > relacionada > complementar). Normas com
// muitos textos (o Código de Ética tem dezenas) pesam menos que as específicas; textos cujo
// título ou temas têm palavras da pergunta sobem.
const PESO_PRIORIDADE = { principal: 3, relacionada: 2, complementar: 1 };

export function leiturasParaEvidencias(literatura, evidencias, pergunta = "", limite = 6) {
  const itens = literatura?.itens || [];
  if (!itens.length || !evidencias?.length) return [];
  const pesoChave = new Map();
  for (const e of evidencias) {
    const chave = chaveNorma(e.documento.id, e.unidade || { parte: e.parte });
    const p = PESO_PRIORIDADE[e.prioridade] || 1;
    pesoChave.set(chave, Math.max(pesoChave.get(chave) || 0, p));
  }
  const quantos = new Map();
  for (const i of itens) for (const n of i.normas) quantos.set(n, (quantos.get(n) || 0) + 1);
  const termos = palavras(pergunta);
  const pontuados = [];
  for (const i of itens) {
    let nota = 0;
    for (const n of i.normas) {
      if (pesoChave.has(n)) nota += pesoChave.get(n) / Math.log2(1 + quantos.get(n));
    }
    if (!nota) continue;
    const doTexto = palavras(`${i.titulo} ${i.temas.join(" ")}`);
    let comuns = 0;
    for (const t of termos) if (doTexto.has(t)) comuns++;
    nota *= 1 + 0.6 * comuns;
    pontuados.push({ item: i, nota });
  }
  pontuados.sort((a, b) => b.nota - a.nota || String(b.item.ano).localeCompare(String(a.item.ano)));
  return pontuados.slice(0, limite).map((p) => p.item);
}

export function filtrarLeituras(literatura, { texto = "", bloco = "", posicao = "", tipo = "" } = {}) {
  const t = dobrarAcentos(texto.trim().toLowerCase());
  return (literatura?.itens || []).filter((i) =>
    (!bloco || i.blocos.includes(bloco)) && (!posicao || i.posicao === posicao) && (!tipo || i.tipo === tipo) &&
    (!t || dobrarAcentos(`${i.titulo} ${i.autoria} ${i.temas.join(" ")} ${i.resumo}`.toLowerCase()).includes(t)));
}

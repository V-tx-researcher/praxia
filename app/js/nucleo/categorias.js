// Categorias de documentos (D45): agrupam o acervo por natureza do documento, para a resposta
// mostrar o que há de mais próximo em cada uma (resolução, orientação, material de formação…).
// Feitas para crescer: novos tipos de documento oficial entram aqui, sem mexer na busca.
// A ordem é a de leitura: primeiro o que obriga (lei, Código, resoluções), depois o que orienta.

export const CATEGORIAS = [
  { id: "lei", rotulo: "Leis e decretos", descricao: "Legislação federal que regulamenta a profissão ou trata do tema.",
    tipos: ["lei", "decreto", "decreto_lei", "lei_complementar"] },
  { id: "codigo", rotulo: "Código de Ética", descricao: "Código de Ética Profissional do/a Assistente Social.",
    tipos: ["codigo_etica"] },
  { id: "resolucao", rotulo: "Resoluções", descricao: "Normas do CFESS e dos CRESS.",
    tipos: ["resolucao", "resolucao_cress", "portaria"] },
  { id: "orientacao_normativa", rotulo: "Orientações normativas", descricao: "Orientações normativas do CFESS.",
    tipos: ["orientacao_normativa"] },
  { id: "tecnico", rotulo: "Notas técnicas e pareceres", descricao: "Posicionamentos técnicos e jurídicos das entidades. Não são normas.",
    tipos: ["nota_tecnica", "parecer_juridico", "parecer_tecnico", "parecer"] },
  { id: "orientativo", rotulo: "Cartilhas e documentos de orientação", descricao: "Publicações que explicam como aplicar as normas. Não são normas.",
    tipos: ["documento_orientativo", "cartilha", "parametros_atuacao", "brochura", "manual"] },
  { id: "formacao", rotulo: "Formação e base teórica", descricao: "Documentos de formação profissional (ABEPSS e outros). Não são normas.",
    tipos: ["politica_institucional", "diretrizes_curriculares", "material_teorico", "formacao"] },
  { id: "outro", rotulo: "Outros documentos oficiais", descricao: "Documentos oficiais sem categoria específica.", tipos: [] },
];

const POR_TIPO = new Map(CATEGORIAS.flatMap((c) => c.tipos.map((t) => [t, c])));
const OUTRO = CATEGORIAS[CATEGORIAS.length - 1];

// `documento` como montado em evidencias.js / interpretacao.js (tipoId = campo "tipo" do acervo).
// `parte`: parte do documento onde está o trecho. Publicações que reúnem várias normas (ex.: o
// livreto do Código de Ética traz a Lei 8.662/1993 e a Lei 12.317/2010) são classificadas pela parte.
const PARTE_LEI = /^(lei|decreto)\b/i;
export function categoriaDe(documento, parte = "") {
  if (PARTE_LEI.test(String(parte).trim())) return CATEGORIAS[0];
  if (documento.orgao === "ABEPSS" && !POR_TIPO.has(documento.tipoId)) return CATEGORIAS.find((c) => c.id === "formacao");
  return POR_TIPO.get(documento.tipoId) || OUTRO;
}

// O trecho mais próximo de cada categoria. `itens` já vêm em ordem de relevância; trechos
// classificados como "provavelmente não se aplica" só entram se a categoria não tiver outro.
export function maisProximoPorCategoria(itens) {
  const melhor = new Map();
  for (const e of itens) {
    const c = categoriaDe(e.documento, e.parte);
    const atual = melhor.get(c.id);
    const fraco = e.prioridade === "complementar";
    if (!atual || (atual.fraco && !fraco)) melhor.set(c.id, { categoria: c, item: e, fraco });
  }
  return CATEGORIAS.filter((c) => melhor.has(c.id)).map((c) => melhor.get(c.id));
}

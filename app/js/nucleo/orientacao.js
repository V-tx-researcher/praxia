// Orientação institucional por natureza da situação.
// Somente endereços oficiais verificados (ver docs/DOCUMENT_POLICY.md, seção "Canais").
// Não inventar contatos, competências ou procedimentos: quando houver dúvida,
// remeter à página oficial do CFESS com os endereços dos CRESS.

export const CANAIS_VERIFICADOS = {
  enderecosCress: {
    rotulo: "Endereços dos CRESS e Seccionais (portal do CFESS)",
    url: "https://www.cfess.org.br/pagina/view/24",
    verificado_em: "2026-10-26",
  },
  legislacaoCfess: {
    rotulo: "Legislação e resoluções (portal do CFESS)",
    url: "https://www.cfess.org.br/legislacao/index",
    verificado_em: "2026-10-26",
  },
};

const TEXTOS = {
  A: [
    "Esta ferramenta não avalia nem atribui conduta a qualquer profissional. A existência de infração ética só pode ser reconhecida em procedimento próprio, conduzido pelos órgãos competentes do Conjunto CFESS-CRESS, com direito de defesa.",
    "Para esclarecimentos sobre orientação e sobre os procedimentos institucionais cabíveis, procure o CRESS da sua região.",
  ],
  B: [
    "Situações que envolvem condições éticas e técnicas de trabalho podem envolver exigências institucionais, condições materiais e responsabilidades profissionais distintas — nem toda condição inadequada corresponde a infração ética de um/a assistente social.",
    "O CRESS da sua região pode orientar sobre a situação por meio da sua Comissão de Orientação e Fiscalização (COFI), conforme os dispositivos abaixo. Confirme no CRESS a organização local (seccionais e outras estruturas regionais).",
  ],
  C: [
    "Para dúvidas sobre o exercício profissional em sua região, o CRESS competente pode oferecer orientação.",
  ],
};

export const DIFERENCAS_CANAIS =
  "Orientação: esclarecimento sobre normas e procedimentos, sem caráter de apuração. " +
  "Fiscalização: ação do Conselho para verificar condições do exercício profissional. " +
  "Denúncia: comunicação formal de possível irregularidade, que pode dar início a procedimento de apuração conforme as normas do Conjunto CFESS-CRESS. " +
  "Os requisitos e meios de cada um devem ser confirmados junto ao CRESS.";

// Dispositivos oficiais que fundamentam a orientação (Res. CFESS 512/2007, conferida
// em 27/10/2026). Só são exibidos se estiverem no acervo carregado, com texto literal.
const RES_512 = "cfess-resolucao-512-2007#texto-2";
const FUNDAMENTOS = {
  A: [`${RES_512}:art-11:inc-16`, `${RES_512}:art-11:inc-7`],
  B: [`${RES_512}:art-6`, `${RES_512}:art-11:inc-6`, `${RES_512}:art-11:inc-7`],
  C: [`${RES_512}:art-11:inc-6`],
};

export function orientacaoPara(situacao, indice = null) {
  const fundamentos = (FUNDAMENTOS[situacao] || FUNDAMENTOS.C)
    .map((id) => indice?.porId.get(id))
    .filter(Boolean)
    .map((u) => {
      const doc = indice.documentos.get(u.doc);
      const pai = u.pai ? indice.porId.get(u.pai) : null;
      return { rotulo: `Res. CFESS nº 512/2007, ${u.rotulo}`, contexto: pai?.texto || null, texto: u.texto,
        link: doc?.arquivo_url ? `${doc.arquivo_url}#page=${u.pagina}` : doc?.fonte_oficial_url, conferido: !!doc?.conferido };
    });
  return {
    paragrafos: TEXTOS[situacao] || TEXTOS.C,
    diferencas: situacao === "C" ? null : DIFERENCAS_CANAIS,
    canais: [CANAIS_VERIFICADOS.enderecosCress],
    fundamentos,
  };
}

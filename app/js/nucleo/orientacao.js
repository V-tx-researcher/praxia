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
    "O CRESS da sua região pode orientar sobre a situação; a Comissão de Orientação e Fiscalização (COFI) ou, onde houver, a SubCOFI/seccional são as instâncias usualmente responsáveis pela orientação e fiscalização do exercício profissional. Confirme no CRESS a organização local.",
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

export function orientacaoPara(situacao) {
  return {
    paragrafos: TEXTOS[situacao] || TEXTOS.C,
    diferencas: situacao === "C" ? null : DIFERENCAS_CANAIS,
    canais: [CANAIS_VERIFICADOS.enderecosCress],
  };
}

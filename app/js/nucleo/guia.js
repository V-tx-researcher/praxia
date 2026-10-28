// Conteúdo de apoio para quem usa a plataforma: perguntas de exemplo por público e
// glossário em linguagem simples. Textos revisáveis; não são texto normativo.

export const EXEMPLOS = [
  {
    publico: "No exercício profissional",
    perguntas: [
      "Posso compartilhar informações do atendimento com a equipe multidisciplinar?",
      "A instituição não oferece sala com privacidade para o atendimento. O que fazer?",
      "Sou obrigada a depor como testemunha sobre um atendimento sigiloso?",
      "Posso me recusar a fazer uma atividade que não é atribuição do assistente social?",
    ],
  },
  {
    publico: "Na docência e na supervisão de estágio",
    perguntas: [
      "Quais são as responsabilidades do supervisor acadêmico e do supervisor de campo no estágio?",
      "Quantos estagiários um assistente social pode supervisionar?",
      "O que diz o Código de Ética sobre a relação com os usuários?",
    ],
  },
  {
    publico: "Na formação (estudantes)",
    perguntas: [
      "Quais são as atribuições privativas do assistente social?",
      "Qual a carga horária semanal do assistente social?",
      "Como fazer uma denúncia ética no CRESS?",
      "O que é desagravo público e como pedir?",
    ],
  },
];

// [termo, explicação], exibidos em ordem alfabética.
export const GLOSSARIO = [
  ["Alínea", "Subdivisão de um artigo, de um parágrafo ou de um inciso, indicada por letra (a, b, c…)."],
  ["Anotação de Responsabilidade Técnica (ART)", "Registro, no CRESS, de que um/a assistente social responde tecnicamente pelo Serviço Social em uma instituição. Regulamentada pela Res. CFESS nº 1.031/2023."],
  ["Artigo (Art.)", "Unidade básica de uma norma. Pode ser dividido em parágrafos, incisos e alíneas."],
  ["Atribuições privativas", "Atividades que só assistentes sociais podem exercer, listadas no Art. 5º da Lei nº 8.662/1993."],
  ["CFESS", "Conselho Federal de Serviço Social. Edita as normas nacionais da profissão (resoluções, orientações normativas) e julga recursos."],
  ["Código de Ética", "Conjunto de princípios, direitos, deveres e vedações do/a assistente social (Res. CFESS nº 273/1993, com alterações)."],
  ["Código Processual de Ética", "Regras do processo ético: denúncia, instrução, julgamento e recursos (Res. CFESS nº 660/2013, com alterações)."],
  ["Competências", "Atividades que o/a assistente social pode exercer, mas que não são exclusivas da profissão (Art. 4º da Lei nº 8.662/1993)."],
  ["Conjunto CFESS-CRESS", "O Conselho Federal e os Conselhos Regionais, que juntos orientam, fiscalizam e defendem o exercício profissional."],
  ["COFI", "Comissão de Orientação e Fiscalização do CRESS, responsável pelas visitas e ações de fiscalização."],
  ["CRESS", "Conselho Regional de Serviço Social. Faz a inscrição, a orientação e a fiscalização na sua região e recebe denúncias éticas."],
  ["Desagravo público", "Ato do CRESS em defesa de assistente social ofendido/a no exercício da profissão (Res. CFESS nº 1.073/2024)."],
  ["Desaforamento", "Envio de uma denúncia ética para outro CRESS julgar, em situações previstas (Res. CFESS nº 548/2009)."],
  ["Dispositivo", "Qualquer parte identificada de uma norma: artigo, parágrafo, inciso ou alínea."],
  ["Documento de Identidade Profissional (DIP)", "Carteira profissional expedida pelo CRESS a quem está inscrito/a."],
  ["Inciso", "Subdivisão de um artigo ou parágrafo, indicada por algarismo romano (I, II, III…)."],
  ["Lei nº 8.662/1993", "Lei de Regulamentação da Profissão: define quem pode exercer, as competências, as atribuições privativas e os Conselhos."],
  ["Orientação Normativa", "Documento do CFESS que orienta a aplicação de normas em situações específicas."],
  ["Parágrafo (§)", "Complemento de um artigo, que detalha ou cria exceção à regra do caput (o texto principal do artigo)."],
  ["Resolução", "Norma editada pelo CFESS para regulamentar aspectos do exercício profissional."],
  ["Revogada", "Norma ou dispositivo que deixou de valer porque outra norma o retirou. Serve para consulta histórica."],
  ["Salvaguarda (lacração) de material sigiloso", "Procedimento para proteger documentos sigilosos do Serviço Social quando o/a profissional deixa o cargo ou o serviço é extinto (Res. CFESS nº 1.098/2025)."],
  ["Sigilo profissional", "Dever de proteger as informações conhecidas no exercício da profissão (Arts. 15 a 18 do Código de Ética)."],
  ["Supervisão direta de estágio", "Acompanhamento do/a estudante por supervisor/a acadêmico/a (da instituição de ensino) e de campo (do local de estágio) (Res. CFESS nº 533/2008)."],
  ["Suspensa ou invalidada por decisão judicial", "Norma que a Justiça impediu de produzir efeitos. Não deve ser aplicada, mesmo sem revogação pelo CFESS."],
  ["Versão compilada", "Texto da norma publicado pelo CFESS já com as alterações posteriores incorporadas."],
  ["Vigente com alterações", "Norma em vigor que teve partes modificadas depois. Confira os avisos de cada dispositivo."],
].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));

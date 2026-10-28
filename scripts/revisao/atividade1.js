// Gera a Atividade de conferência nº 1 (Código de Ética) em .docx.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, ExternalHyperlink, BorderStyle, Footer, PageNumber, LevelFormat,
} = require("docx");

const destino = process.argv[2];
const AZUL = "173456";
const CAIXA = "F2F6FB";
const LARGURA = 9638; // A4 com margens de 2 cm (DXA)

const borda = { style: BorderStyle.SINGLE, size: 4, color: "B9C4D0" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };

const t = (texto, op = {}) => new TextRun({ text: texto, font: "Calibri", size: 22, ...op });
const p = (filhos, op = {}) => new Paragraph({ spacing: { after: 120 }, ...op, children: [].concat(filhos) });
const titulo = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { before: 320, after: 140 },
  children: [new TextRun({ text: texto, font: "Calibri", size: 28, bold: true, color: AZUL })] });
const link = (texto, url) => new ExternalHyperlink({ link: url,
  children: [new TextRun({ text: texto, font: "Calibri", size: 22, color: "1D5590", underline: {} })] });
const marcar = (opcao) => t(`☐  ${opcao}`);

function celula(conteudo, largura, { cabecalho = false, resposta = false } = {}) {
  const lista = conteudo === "SIMNAO" ? ["☐ Sim", "☐ Não"] : [].concat(conteudo);
  const paragrafos = lista.map((c) => (c instanceof Paragraph ? c
    : new Paragraph({ children: [t(String(c), cabecalho ? { bold: true, color: "FFFFFF" } : {})] })));
  return new TableCell({
    width: { size: largura, type: WidthType.DXA }, borders: bordas,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: cabecalho ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" }
      : resposta ? { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" } : undefined,
    children: paragrafos,
  });
}

function tabela(larguras, cabecalho, linhas, colunasResposta = []) {
  return new Table({
    width: { size: larguras.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: larguras,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((c, i) => celula(c, larguras[i], { cabecalho: true })) }),
      ...linhas.map((l) => new TableRow({ height: { value: 520, rule: "atLeast" }, children: l.map((c, i) => celula(c, larguras[i], { resposta: colunasResposta.includes(i) })) })),
    ],
  });
}

// Caixa de resposta livre (tabela de uma célula, sombreada).
function caixa(rotulo, linhas = 3) {
  return new Table({
    width: { size: LARGURA, type: WidthType.DXA }, columnWidths: [LARGURA],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: LARGURA, type: WidthType.DXA }, borders: bordas,
      shading: { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [t(rotulo, { italics: true, color: "4F5D70" })] }),
        ...Array.from({ length: linhas }, () => new Paragraph({ children: [t("")] }))],
    })] })],
  });
}

const PDF = "https://www.cfess.org.br/uploads/legislacao/3781/CEP_CFESS-SITE.pdf";
const PAGINA = "https://www.cfess.org.br/legislacao/view/207/codigo-de-etica-profissional-doa-assistente-social-10-edicao";
const PDF954 = "https://www.cfess.org.br/uploads/legislacao/4406/ResolucaoCfess954-2020.pdf";

const amostras = [
  ["1", "Princípio fundamental I", "24", "I. Reconhecimento da liberdade como valor ético central e das demandas políticas a ela inerentes - autonomia, emancipação e plena expansão dos indivíduos sociais;"],
  ["2", "Art. 4º, alínea c", "28", "c- acatar determinação institucional que fira os princípios e diretrizes deste Código;"],
  ["3", "Art. 17", "36", "Art. 17 É vedado ao/à assistente social revelar sigilo profissional."],
  ["4", "Art. 22, alínea c", "39", "c- deixar de pagar, regularmente, as anuidades e contribuições devidas ao Conselho Regional de Serviço Social a que esteja obrigado/a;"],
  ["5", "Lei 8.662/93, Art. 5º-A", "48", "Art. 5º-A. A duração do trabalho do Assistente Social é de 30 (trinta) horas semanais. (Incluído pela Lei nº 12.317, de 2010)."],
  ["6", "Resolução 273/93, Art. 1º", "19", "Art. 1º Instituir o Código de Ética Profissional do assistente social em anexo."],
];

const partes = [
  ["Apresentação à edição de 2011", "14–15", "Texto editorial (fica fora do acervo público)"],
  ["Apresentação à edição de 1996", "16", "Texto editorial (fica fora do acervo público)"],
  ["Resolução CFESS nº 273/1993", "18–19", "Norma"],
  ["Introdução", "20–23", "Texto editorial (fica fora do acervo público)"],
  ["Princípios Fundamentais (I a XI)", "24–25", "Norma"],
  ["Código de Ética (Arts. 1º a 36)", "26–43", "Norma"],
  ["Lei nº 8.662/1993 (já com o Art. 5º-A)", "44–56", "Norma"],
  ["Lei nº 12.317/2010", "58", "Norma"],
];

const doc = new Document({
  creator: "PraxIA — consulta ético-normativa (GPECSS)",
  title: "Atividade de conferência nº 1 — Código de Ética",
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  numbering: { config: [{ reference: "etapas", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t("PraxIA (GPECSS) · Atividade de conferência nº 1 · página ", { size: 18, color: "6B7785" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "6B7785" })] })] }) },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [t("PLATAFORMA DE CONSULTA ÉTICO-NORMATIVA — GPECSS", { bold: true, size: 20, color: "4F5D70" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Atividade de conferência nº 1", font: "Calibri", size: 40, bold: true, color: AZUL })] }),
      new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL, space: 6 } },
        children: [t("Código de Ética do/a Assistente Social (10ª edição) — CFESS", { size: 26 })] }),

      titulo("Orientações"),
      p([t("Esta atividade confere se o sistema leu corretamente o documento oficial. Só depois dela o Código de Ética poderá aparecer no acervo público da plataforma.")]),
      p([t("Como responder:", { bold: true })]),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Abra o PDF oficial: "), link("CEP_CFESS-SITE.pdf", PDF), t(" (os números de página desta atividade são as páginas do PDF, não as do livro impresso).")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Nas questões de marcar, troque ☐ por ☒ ou X na opção escolhida.")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Escreva nas caixas azuladas. Deixe em branco o que estiver correto e não precisar de comentário.")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, spacing: { after: 160 }, children: [t("Ao terminar, salve o arquivo e me avise no chat.")] }),
      p([t("Página oficial do documento: "), link("portal do CFESS", PAGINA)]),
      p([t("Tempo estimado: 20 a 30 minutos.", { italics: true, color: "4F5D70" })]),

      titulo("Questão 1 — O arquivo é o documento oficial?"),
      p([t("O PDF acima é o arquivo publicado pelo CFESS na página oficial do Código de Ética (10ª edição, revista e atualizada)?")]),
      p([marcar("Sim, é o arquivo oficial"), t("     "), marcar("Não"), t("     "), marcar("Não consegui verificar")]),
      caixa("Observação (se houver):", 2),

      titulo("Questão 2 — Dados de identificação"),
      p([t("Confira os dados que serão exibidos para quem consultar a plataforma.")]),
      tabela([2400, 4038, 1200, 2000], ["Campo", "Registrado pelo sistema", "Confere?", "Correção"], [
        ["Título", "Código de Ética Profissional do/a Assistente Social (10ª edição)", "SIMNAO", ""],
        ["Tipo de documento", "Código de Ética", "SIMNAO", ""],
        ["Órgão emissor", "CFESS", "SIMNAO", ""],
        ["Ano", "1993 (instituído pela Resolução CFESS nº 273/1993)", "SIMNAO", ""],
        ["Alterações já incorporadas no texto", "Resoluções CFESS nº 290/1994, 293/1994, 333/1996 e 594/2011 (conforme a página oficial)", "SIMNAO", ""],
      ], [2, 3]),

      titulo("Questão 3 — Divisão do livreto em partes"),
      p([t("O livreto reúne vários textos. O sistema separou-os assim (páginas do PDF). Textos editoriais podem ter direitos autorais e por isso não entram no acervo público; as normas, sim.")]),
      tabela([3300, 1100, 2938, 1100, 1200], ["Parte", "Páginas", "Tratamento", "Confere?", "Correção"],
        partes.map(([a, b, c]) => [a, b, c, "SIMNAO", ""]), [3, 4]),

      titulo("Questão 4 — Trechos de amostra"),
      p([t("Compare cada trecho com o PDF, na página indicada. A plataforma só mostra trechos copiados literalmente; diferenças de letra, acento ou pontuação devem ser apontadas.")]),
      tabela([500, 1700, 800, 4338, 1100, 1200], ["Nº", "Dispositivo", "Pág. PDF", "Texto lido pelo sistema", "Igual ao PDF?", "Diferença"],
        amostras.map(([n, d, pg, tx]) => [n, d, pg, tx, "SIMNAO", ""]), [4, 5]),
      p([t("Defeito já conhecido: no Art. 16 da Lei 8.662/93 (p. 53), os §§ 1º e 2º ficaram junto ao inciso III, porque o PDF não traz o símbolo “§”. O texto está completo; só a divisão interna desse artigo ficou imperfeita.", { italics: true, size: 20, color: "4F5D70" })], { spacing: { before: 120, after: 120 } }),

      titulo("Questão 5 — Situação normativa (vigência)"),
      p([t("A Resolução CFESS nº 954/2020, no Art. 1º, diz: “Extinguir, no âmbito do Conjunto CFESS/CRESS, a infração disciplinar que consiste em deixar de pagar, regularmente, as anuidades e contribuições devidas ao CRESS”. Isso afeta o "),
        t("Art. 22, alínea c", { bold: true }), t(" do Código (amostra 4).")]),
      p([t("5a) Qual é a situação do Código de Ética hoje?", { bold: true })]),
      p(marcar("Vigente com alterações — está em vigor, mas há dispositivos alterados ou extintos por normas posteriores")),
      p(marcar("Vigente (confirmada) — a edição publicada reflete integralmente o texto em vigor")),
      p(marcar("Outra situação (explique abaixo)")),
      caixa("Explicação (se necessário):", 2),
      new Paragraph({ spacing: { before: 200, after: 120 }, children: [t("5b) Quais dispositivos do Código foram alterados, extintos ou revogados por normas posteriores?", { bold: true })] }),
      tabela([2600, 3000, 4038], ["Dispositivo do Código", "Norma que alterou", "O que mudou"], [
        ["Art. 22, alínea c", "Res. CFESS 954/2020", ""],
        ["", "", ""], ["", "", ""],
      ], [0, 1, 2]),
      new Paragraph({ spacing: { before: 200, after: 120 }, children: [t("5c) Texto que o sistema não conseguiu ler na Res. 954/2020", { bold: true })] }),
      p([t("No PDF da Res. 954/2020 (página 2), o Art. 3º, inciso I, saiu incompleto na leitura automática: “I - “ ” 22 ú 25 o 273/1993.” Por favor, copie abaixo o texto exato desse inciso. Link direto: "),
        link("ResolucaoCfess954-2020.pdf", PDF954), t(".")]),
      caixa("Art. 3º, inciso I, da Res. 954/2020 (texto exato):", 2),

      titulo("Questão 6 — Divulgação do arquivo"),
      p([t("Como a plataforma deve tratar o PDF?")]),
      p(marcar("Mostrar só o link para o PDF oficial e os trechos citados (recomendado)")),
      p(marcar("Pode disponibilizar uma cópia do PDF na própria plataforma")),

      titulo("Questão 7 — Observações gerais"),
      caixa("Algo mais que você percebeu e que deva ser corrigido ou registrado:", 4),

      titulo("Glossário"),
      p([t("Vigente: ", { bold: true }), t("norma em vigor.")]),
      p([t("Vigente com alterações: ", { bold: true }), t("norma em vigor que teve partes modificadas, incluídas ou retiradas por normas posteriores.")]),
      p([t("Revogada: ", { bold: true }), t("norma que deixou de valer; permanece no acervo como referência histórica.")]),
      p([t("Dispositivo: ", { bold: true }), t("cada unidade do texto normativo: artigo, parágrafo, inciso ou alínea.")]),
      p([t("Leitura automática (extração): ", { bold: true }), t("cópia do texto do PDF feita pelo sistema; esta atividade confere se ela saiu fiel.")]),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(destino, b); console.log("gerado:", destino); });

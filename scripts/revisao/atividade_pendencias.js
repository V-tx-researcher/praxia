// Gera a Atividade nº 9: só as pendências que restaram das conferências (28/10/2026).
// Uso (na raiz, NODE_PATH apontando para um node_modules com docx):
//   node scripts/revisao/atividade_pendencias.js docs/revisao/Atividade_09_Pendencias.docx
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, ExternalHyperlink, BorderStyle, Footer, PageNumber, AlignmentType,
} = require("docx");

const [, , destino] = process.argv;
const AZUL = "173456";
const CAIXA = "F2F6FB";
const LARGURA = 9638;
const borda = { style: BorderStyle.SINGLE, size: 4, color: "B9C4D0" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const t = (texto, op = {}) => new TextRun({ text: texto, font: "Calibri", size: 22, ...op });
const p = (filhos, op = {}) => new Paragraph({ spacing: { after: 100 }, ...op, children: [].concat(filhos) });
const link = (texto, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: texto, font: "Calibri", size: 22, color: "1D5590", underline: {} })] });
const titulo = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 320, after: 120 },
  children: [new TextRun({ text: texto, font: "Calibri", size: 28, bold: true, color: AZUL })] });
const pergunta = (texto) => new Paragraph({ keepNext: true, spacing: { before: 160, after: 80 }, children: [t(texto, { bold: true })] });
const citacao = (texto) => new Paragraph({ spacing: { after: 120 }, indent: { left: 400 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 8 } }, children: [t(texto, { italics: true })] });

function celula(conteudo, largura, { cabecalho = false, resposta = false } = {}) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA }, borders: bordas, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: cabecalho ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : resposta ? { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" } : undefined,
    children: [].concat(conteudo).map((c) => new Paragraph({ children: [t(String(c), cabecalho ? { bold: true, color: "FFFFFF" } : {})] })),
  });
}
function tabela(larguras, cabecalho, linhas, resp = []) {
  return new Table({ width: { size: LARGURA, type: WidthType.DXA }, columnWidths: larguras,
    rows: [new TableRow({ tableHeader: true, children: cabecalho.map((c, i) => celula(c, larguras[i], { cabecalho: true })) }),
      ...linhas.map((l) => new TableRow({ cantSplit: true, children: l.map((c, i) => celula(c, larguras[i], { resposta: resp.includes(i) })) }))] });
}
function caixa(rotulo, linhas = 2) {
  return new Table({ width: { size: LARGURA, type: WidthType.DXA }, columnWidths: [LARGURA], rows: [new TableRow({ children: [new TableCell({
    width: { size: LARGURA, type: WidthType.DXA }, borders: bordas, shading: { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [t(rotulo, { italics: true, color: "4F5D70" })] }), ...Array.from({ length: linhas }, () => new Paragraph({ children: [t("")] }))],
  })] })] });
}

const corpo = [
  new Paragraph({ spacing: { after: 60 }, children: [t("PLATAFORMA DE CONSULTA ÉTICO-NORMATIVA — GPECSS", { bold: true, size: 20, color: "4F5D70" })] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Atividade de conferência nº 9", font: "Calibri", size: 40, bold: true, color: AZUL })] }),
  new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL, space: 6 } },
    children: [t("Pendências que restaram das atividades nº 5 a 8 (4 itens curtos)", { size: 26 })] }),
  p(t("Marque ☒ ou X nas opções e escreva nas caixas azuladas só o que precisar. Os itens 1 a 3 levam poucos minutos; o item 4 é opcional e depende de pesquisa.")),

  titulo("1. Orientação Normativa 2/2018 — divergência"),
  p(t("Na Atividade nº 7 você marcou esta orientação como \"Vigente\". Mas a Resolução CFESS nº 1.031/2023, que trata hoje da Anotação de Responsabilidade Técnica, diz no Art. 14 (texto oficial, p. 5 do PDF):")),
  citacao("Art. 14 Ficam revogadas a Resolução CFESS no 792/2017 e a Orientação Normativa CFESS no 02/2018."),
  p([t("Fonte: "), link("PDF da Res. 1.031/2023 (compilada)", "https://www.cfess.org.br/uploads/legislacao/5359/1031-2023compilada.pdf"),
    t("   ·   "), link("página da ON 2/2018", "https://www.cfess.org.br/legislacao/view/559/orientacao-normativa-22018")]),
  p(t("Por isso a plataforma já a registrou como revogada (o lado mais seguro). Confirme:")),
  p(t("☐  Concordo: a ON 2/2018 está revogada pela Res. 1.031/2023     ☐  Discordo")),
  caixa("Se discorda, por quê:", 1),

  titulo("2. Resolução nº 1.147/2026 — pergunta a) ficou sem marcação"),
  p([t("PDF oficial: "), link("1147-2026 (INFO DOU).pdf", "https://www.cfess.org.br/uploads/legislacao/5790/1147-2026%20(INFO%20DOU).pdf"),
    t("   ·   "), link("página oficial", "https://www.cfess.org.br/legislacao/view/677/resolucao-n-11472026")]),
  pergunta("a) O PDF é o documento oficial e está completo (do título à assinatura e publicação no DOU)?"),
  p(t("☐  Sim     ☐  Não     ☐  Não consegui verificar")),

  titulo("3. Resolução nº 383/1999 — arquivo e trechos ficaram sem marcação"),
  p(t("O PDF oficial é uma imagem digitalizada. O texto foi transcrito da imagem e já conferido automaticamente com um exemplar em texto publicado pelo CFESS (99,8% igual; só muda um hífen). Falta só o seu olhar: abra o PDF de imagem e compare os três artigos abaixo.")),
  p([t("PDF oficial (imagem): "), link("Resolucao38399.pdf", "https://www.cfess.org.br/uploads/legislacao/4640/Resolucao38399.pdf"),
    t("   ·   "), link("exemplar em texto", "https://www.cfess.org.br/arquivos/resolucao_383_99.pdf"),
    t("   ·   "), link("página oficial", "https://www.cfess.org.br/legislacao/view/528/resolucao-n-3831999")]),
  pergunta("a) O PDF é o documento oficial e está completo?"),
  p(t("☐  Sim     ☐  Não     ☐  Não consegui verificar")),
  pergunta("b) Os trechos abaixo são iguais ao PDF (p. 2)?"),
  tabela([1500, 6438, 1700], ["Dispositivo", "Texto usado pelo sistema", "Igual?"], [
    ["Art. 1º", "Art. 1º - Caracterizar o assistente social como profissional de saúde.", ["☐ Sim", "☐ Não"]],
    ["Art. 2º", "Art. 2º - O assistente social atua no âmbito das políticas sociais e, nesta medida, não é um profissional exclusivamente da área da saúde, podendo estar inserido em outras áreas, dependendo do local onde atua e da natureza de suas funções.", ["☐ Sim", "☐ Não"]],
    ["Art. 3º", "Art. 3º - Esta Resolução entra em vigor na data de sua publicação.", ["☐ Sim", "☐ Não"]],
  ], [2]),

  titulo("4. Código de Ética — alterações antigas ainda sem texto (opcional)"),
  p(t("Na Atividade nº 1 você indicou alterações do Código de Ética por resoluções dos anos 1990 cujo texto não está no portal do CFESS. Sem o texto oficial, a plataforma não as exibe. Se você (ou o ChatGPT) localizar o texto oficial (DOU ou outro arquivo do CFESS), anote o link e o que mudou:")),
  tabela([2600, 3538, 3500], ["Norma", "O que se sabe", "Link do texto oficial e o que alterou"], [
    ["Res. CFESS nº 290/1994", "Possível alteração do Art. 25, caput, e do Art. 20, alínea a", ""],
    ["Res. CFESS nº 333/1996", "Possível alteração do Art. 25, caput", ""],
    ["Res. CFESS nº 293/1994", "Dispositivos alterados a identificar", ""],
  ], [2]),
  p(t("Ao terminar, salve este arquivo nesta pasta (mesmo nome) e me avise no chat.", { italics: true }), { spacing: { before: 240 } }),
];

const doc = new Document({
  creator: "PraxIA — consulta ético-normativa (GPECSS)",
  title: "Atividade de conferência nº 9 — pendências",
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t("PraxIA (GPECSS) · Atividade nº 9 (pendências) · página ", { size: 18, color: "6B7785" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "6B7785" })] })] }) },
    children: corpo,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(destino, b); console.log("gerado:", destino); });

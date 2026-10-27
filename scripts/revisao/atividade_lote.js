// Gera uma atividade de conferência em lote (.docx) a partir de lote-NN.json.
// Uso: node scripts/revisao/atividade_lote.js <lote.json> <saida.docx> <nº da atividade>
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, ExternalHyperlink, BorderStyle, Footer, PageNumber, LevelFormat, PageBreak,
} = require("docx");

const [, , arqLote, destino, numAtividade] = process.argv;
const lote = JSON.parse(fs.readFileSync(arqLote, "utf8"));
const AZUL = "173456";
const CAIXA = "F2F6FB";
const LARGURA = 9638;
const borda = { style: BorderStyle.SINGLE, size: 4, color: "B9C4D0" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const t = (texto, op = {}) => new TextRun({ text: texto, font: "Calibri", size: 22, ...op });
const p = (filhos, op = {}) => new Paragraph({ spacing: { after: 100 }, ...op, children: [].concat(filhos) });
const link = (texto, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: texto, font: "Calibri", size: 22, color: "1D5590", underline: {} })] });
const titulo = (texto, quebra = false) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: quebra,
  spacing: { before: 280, after: 120 }, children: [new TextRun({ text: texto, font: "Calibri", size: 28, bold: true, color: AZUL })] });
const subtitulo = (texto) => new Paragraph({ keepNext: true, spacing: { before: 180, after: 80 }, children: [t(texto, { bold: true })] });

function celula(conteudo, largura, { cabecalho = false, resposta = false } = {}) {
  const lista = conteudo === "SIMNAO" ? ["☐ Sim", "☐ Não"] : [].concat(conteudo);
  return new TableCell({
    width: { size: largura, type: WidthType.DXA }, borders: bordas, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: cabecalho ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : resposta ? { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" } : undefined,
    children: lista.map((c) => new Paragraph({ children: [t(String(c), cabecalho ? { bold: true, color: "FFFFFF" } : {})] })),
  });
}
function tabela(larguras, cabecalho, linhas, resp = []) {
  return new Table({ width: { size: larguras.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: larguras,
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
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `Atividade de conferência nº ${numAtividade}`, font: "Calibri", size: 40, bold: true, color: AZUL })] }),
  new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL, space: 6 } },
    children: [t(`Lote ${lote.lote}: ${lote.documentos.filter((d) => !d.somente_pedido).length} normas`, { size: 26 })] }),
  titulo("Orientações"),
  p(t("Para cada documento: abra o PDF pelo link, compare os trechos de amostra e indique a situação da norma hoje. É a mesma lógica da Atividade nº 1, mais curta.")),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Marque ☒ ou X nas opções. Escreva nas caixas azuladas só o que precisar.")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("As “relações já conhecidas” são informações do portal ou conferidas antes; servem de apoio, não de resposta.")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Os números de página são os do PDF.")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, spacing: { after: 160 }, children: [t("Ao terminar, salve e me avise no chat. Pode fazer em partes.")] }),
  tabela([800, 6838, 2000], ["Nº", "Documento", "Páginas do PDF"], lote.documentos.map((d, i) => [String(i + 1), d.titulo, d.paginas_pdf ? String(d.paginas_pdf) : "—"])),
];

lote.documentos.forEach((d, i) => {
  corpo.push(titulo(`${d.somente_pedido ? "Pendência" : "Documento"} ${i + 1} — ${d.titulo}`, true));
  if (d.ementa && !d.somente_pedido) corpo.push(p(t(d.ementa, { italics: true, color: "4F5D70" })));
  corpo.push(p([t("PDF oficial: "), link(d.pdf.split("/").pop(), d.pdf), t("   ·   "), link("página oficial", d.pagina_oficial)]));
  if (d.somente_pedido) {
    // Documento já conferido em lote anterior: só falta a transcrição pedida.
    corpo.push(p(t(d.pedido_extra)));
    corpo.push(caixa("Transcrição:", 3));
    return;
  }

  corpo.push(subtitulo("a) O PDF é o documento oficial e está completo?"));
  corpo.push(p(t("☐  Sim     ☐  Não     ☐  Não consegui verificar")));

  corpo.push(subtitulo("b) Os trechos lidos pelo sistema são iguais ao PDF?"));
  corpo.push(tabela([1900, 700, 5538, 1500], ["Dispositivo", "Pág.", "Texto lido pelo sistema", "Igual?"],
    d.amostras.map((a) => [a.rotulo, String(a.pagina), a.texto, "SIMNAO"]), [3]));

  corpo.push(subtitulo("c) Qual é a situação desta norma hoje?"));
  if (d.relacoes_conhecidas.length || d.indicacoes_portal.length || d.mencoes.length) {
    corpo.push(p(t("Relações já conhecidas:", { size: 20, bold: true, color: "4F5D70" })));
    for (const r of [...d.relacoes_conhecidas, ...d.indicacoes_portal.map((x) => `Portal: ${x}`),
      ...d.mencoes.map((m) => `O próprio texto menciona: ${m}`)]) {
      corpo.push(new Paragraph({ numbering: { reference: "pontos", level: 0 }, children: [t(r, { size: 20, color: "4F5D70" })] }));
    }
  }
  corpo.push(p(t("☐  Vigente     ☐  Vigente com alterações     ☐  Revogada     ☐  Suspensa ou invalidada     ☐  Não sei")));
  corpo.push(caixa("Se alterada, revogada ou suspensa: por qual norma e em quê (se souber):", 2));

  if (d.pedido_extra) {
    corpo.push(subtitulo("d) Texto que o sistema não conseguiu ler"));
    corpo.push(p(t(d.pedido_extra)));
    corpo.push(caixa("Transcrição:", 3));
  }
  let letra = d.pedido_extra ? "e" : "d";
  if (d.riscados && d.riscados.length) {
    corpo.push(subtitulo(`${letra}) Trechos riscados retirados pelo sistema`));
    corpo.push(p(t("O PDF traz trechos riscados (redação revogada). O sistema os retirou do texto pesquisável. Confirme que estão mesmo riscados no PDF:")));
    corpo.push(tabela([700, 7438, 1500], ["Pág.", "Texto retirado (início)", "Riscado?"],
      d.riscados.map((r) => [String(r.pagina), r.texto, "SIMNAO"]), [2]));
    letra = String.fromCharCode(letra.charCodeAt(0) + 1);
  }
  corpo.push(subtitulo(`${letra}) Observações`));
  corpo.push(caixa("Algo a corrigir ou registrar sobre este documento:", 1));
});

const doc = new Document({
  creator: "Plataforma de Consulta Ético-Normativa — GPECSS",
  title: `Atividade de conferência nº ${numAtividade} — lote ${lote.lote}`,
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  numbering: { config: [
    { reference: "etapas", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
    { reference: "pontos", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
  ] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t(`GPECSS · Consulta Ético-Normativa · Atividade nº ${numAtividade} (lote ${lote.lote}) · página `, { size: 18, color: "6B7785" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "6B7785" })] })] }) },
    children: corpo,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(destino, b); console.log("gerado:", destino); });

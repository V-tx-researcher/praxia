// Gera a Atividade de conferência nº 2 (triagem do acervo) em .docx.
// Uso: node scripts/revisao/atividade2.js <triagem.json> <saida.docx>
// Requer o pacote npm "docx" (instalado à parte; ver scripts/revisao/LEIA-ME).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, BorderStyle, Footer, PageNumber, LevelFormat,
} = require("docx");

const [, , arqTriagem, destino] = process.argv;
const triagem = JSON.parse(fs.readFileSync(arqTriagem, "utf8"));
const AZUL = "173456";
const CAIXA = "F2F6FB";
const LARGURA = 9638;

const borda = { style: BorderStyle.SINGLE, size: 4, color: "B9C4D0" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const t = (texto, op = {}) => new TextRun({ text: texto, font: "Calibri", size: 22, ...op });
const p = (filhos, op = {}) => new Paragraph({ spacing: { after: 120 }, ...op, children: [].concat(filhos) });
const titulo = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true,
  spacing: { before: 320, after: 140 }, children: [new TextRun({ text: texto, font: "Calibri", size: 28, bold: true, color: AZUL })] });

function rotulo(id) {
  let m = /^cfess-resolucao-(\d+)-(\d{4})/.exec(id);
  if (m) return `Res. ${Number(m[1]).toLocaleString("pt-BR")}/${m[2]}`;
  m = /^cfess-orientacao-normativa-(\d+)-(\d{4})/.exec(id);
  if (m) return `Orientação Normativa ${m[1]}/${m[2]}`;
  return (triagem.titulos?.[id] || id).replace(/\.$/, "");
}

function celula(conteudo, largura, { cabecalho = false, resposta = false, tamanho = 22 } = {}) {
  const lista = conteudo === "SIMNAO" ? ["☐ Sim", "☐ Não"] : [].concat(conteudo);
  return new TableCell({
    width: { size: largura, type: WidthType.DXA }, borders: bordas,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: cabecalho ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" }
      : resposta ? { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" } : undefined,
    children: lista.map((c) => new Paragraph({ children: [t(String(c), cabecalho ? { bold: true, color: "FFFFFF", size: tamanho } : { size: tamanho })] })),
  });
}

function tabela(larguras, cabecalho, linhas, colunasResposta = [], tamanho = 22) {
  return new Table({
    width: { size: larguras.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: larguras,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((c, i) => celula(c, larguras[i], { cabecalho: true, tamanho })) }),
      ...linhas.map((l) => new TableRow({ cantSplit: true, children: l.map((c, i) => celula(c, larguras[i], { resposta: colunasResposta.includes(i), tamanho })) })),
    ],
  });
}

function caixa(rotuloCaixa, linhas = 3) {
  return new Table({
    width: { size: LARGURA, type: WidthType.DXA }, columnWidths: [LARGURA],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: LARGURA, type: WidthType.DXA }, borders: bordas,
      shading: { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [t(rotuloCaixa, { italics: true, color: "4F5D70" })] }),
        ...Array.from({ length: linhas }, () => new Paragraph({ children: [t("")] }))],
    })] })],
  });
}

let n = 0;
const linhasDecisao = (grupo) => Object.entries(grupo).map(([id, assunto]) => [String(++n), rotulo(id), assunto, "SIMNAO"]);
const larg = [600, 2300, 5438, 1300];

const excluir = Object.entries(triagem.excluir);

const doc = new Document({
  creator: "PraxIA — consulta ético-normativa (GPECSS)",
  title: "Atividade de conferência nº 2 — Triagem do acervo",
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  numbering: { config: [{ reference: "etapas", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t("PraxIA (GPECSS) · Atividade de conferência nº 2 · página ", { size: 18, color: "6B7785" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "6B7785" })] })] }) },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [t("PLATAFORMA DE CONSULTA ÉTICO-NORMATIVA — GPECSS", { bold: true, size: 20, color: "4F5D70" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Atividade de conferência nº 2", font: "Calibri", size: 40, bold: true, color: AZUL })] }),
      new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL, space: 6 } },
        children: [t("Triagem do acervo: quais normas do CFESS entram na plataforma", { size: 26 })] }),

      titulo("Orientações"),
      p([t("O portal do CFESS tem 352 normas (resoluções, leis e orientações normativas) e 288 portarias. Como combinado, só entra na plataforma o que tem impacto ou uso no exercício profissional.")]),
      p([t("Eu fiz uma proposta a partir do título e da ementa de cada norma. ", {}), t("A decisão é sua.", { bold: true })]),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Nas tabelas, marque ☒ ou X em Sim (entra) ou Não (fica de fora).")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Se concordar com a sugestão de um grupo inteiro, basta marcar a opção “concordo com todo o grupo” no início dele.")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Na lista de exclusão (anexo), escreva na caixa os números das que, ao contrário, devem entrar.")] }),
      new Paragraph({ numbering: { reference: "etapas", level: 0 }, spacing: { after: 160 }, children: [t("Ao terminar, salve o arquivo e me avise no chat.")] }),
      p([t("Depois desta triagem, as normas escolhidas serão baixadas e lidas pelo sistema, e eu mando as conferências de texto em lotes.", { italics: true, color: "4F5D70" })]),

      titulo(`Grupo 1 — Sugiro incluir (${Object.keys(triagem.incluir).length} normas)`),
      p([t("Normas com impacto direto no exercício profissional: ética, atribuições, sigilo, estágio, fiscalização, processo ético, inscrição e registro, vedações de discriminação.")]),
      p([t("☐  Concordo com todo o grupo (não preciso marcar linha por linha)", { bold: true })]),
      tabela(larg, ["Nº", "Norma", "Assunto", "Incluir?"], linhasDecisao(triagem.incluir), [3]),

      titulo(`Grupo 2 — Históricas: revogadas ou suspensas, mas úteis (${Object.keys(triagem.historicas).length})`),
      p([t("Não valem mais (ou estão suspensas), mas ajudam em perguntas sobre fatos passados e mostram a mudança das normas. Entrariam marcadas como revogadas/históricas.")]),
      p([t("☐  Concordo com todo o grupo", { bold: true })]),
      tabela(larg, ["Nº", "Norma", "Situação", "Incluir?"], linhasDecisao(triagem.historicas), [3]),

      titulo(`Grupo 3 — Dúvida (${Object.keys(triagem.duvida).length})`),
      p([t("Têm alguma relação com a profissão, mas talvez não sejam úteis para a consulta. Preciso do seu critério.")]),
      tabela(larg, ["Nº", "Norma", "Assunto", "Incluir?"], linhasDecisao(triagem.duvida), [3]),

      titulo("Grupo 4 — Já incluídas ou duplicadas"),
      p([t("Não precisam de decisão: o Código de Ética, a Lei 8.662/93, a Lei 12.317/10 e a Res. 273/93 já estão no acervo (todas no livreto oficial); a página “Política Nacional de Fiscalização” é o mesmo PDF da Res. 512/2007.")]),

      titulo(`Grupo 5 — Sugiro excluir (${excluir.length} normas + ${triagem.portarias_excluidas} portarias)`),
      p([t("Atos de gestão interna dos Conselhos: eleições e homologações, orçamento, diárias, cargos e salários de funcionários, concursos, fundos e cota-parte, valores e prazos de anuidade, regimentos internos, sistemas de informática, prorrogações de prazos administrativos e reordenamento de diretorias. As portarias são atos administrativos do CFESS.")]),
      p([t("A lista completa está no anexo, numerada. Se alguma deve entrar, escreva os números aqui:")]),
      caixa("Números do anexo que devem entrar (se houver):", 2),

      titulo("Questão — Norma não encontrada"),
      p([t("A Resolução CFESS nº 660/2013 (Código Processual de Ética) é citada por outras resoluções (938/2020 e 1.013/2022), mas não aparece na lista de legislação do portal. Ela deve entrar? Se souber onde está publicada, indique.")]),
      p([t("☐  Sim, deve entrar     ☐  Não é necessária")]),
      caixa("Onde encontrar (se souber):", 1),

      titulo("Observações gerais"),
      caixa("Algo mais sobre o escopo do acervo:", 3),

      titulo("Anexo — Lista de exclusão sugerida"),
      p([t("Ementas abreviadas, conforme o portal do CFESS.", { italics: true, size: 20, color: "4F5D70" })]),
      tabela([700, 1700, 7238], ["Nº", "Norma", "Ementa (resumo)"],
        excluir.map(([id, ementa], i) => [`A${i + 1}`, rotulo(id), ementa.replace(/\s+/g, " ")]), [], 18),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(destino, b); console.log("gerado:", destino, "| decisões:", n, "| anexo:", excluir.length); });

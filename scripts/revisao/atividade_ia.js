// Gera a atividade de avaliação das respostas da IA local (.docx), a partir do
// relatório verificado de uma rodada (tests/avaliacao/reverificar-llm.mjs).
// Uso: node scripts/revisao/atividade_ia.js <llm-...-verificado.json> <saida.docx> <nº> [rótulo do modelo] [camada2.json]
// Com camada2.json, a atividade abre com a Parte A: conferência dos documentos da camada 2 (D41).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, BorderStyle, Footer, PageNumber, AlignmentType, LevelFormat,
} = require("docx");

const [, , arqVerificado, destino, numAtividade, rotuloModelo, arqCamada2] = process.argv;
const camada2 = arqCamada2 ? JSON.parse(fs.readFileSync(arqCamada2, "utf8")).documentos : null;
// SUGESTOES=<json>: versão pré-preenchida (☒ e notas em itálico) para o revisor conferir.
const sug = process.env.SUGESTOES ? JSON.parse(fs.readFileSync(process.env.SUGESTOES, "utf8")) : null;
const notaSug = (texto) => p(t(`Sugestão (IA): ${texto}`, { italics: true, color: "9A6B12" }));
const { resumo, itens } = JSON.parse(fs.readFileSync(arqVerificado, "utf8"));
const AZUL = "173456";
const CAIXA = "F2F6FB";
const LARGURA = 9638;
const borda = { style: BorderStyle.SINGLE, size: 4, color: "B9C4D0" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const t = (texto, op = {}) => new TextRun({ text: texto, font: "Calibri", size: 22, ...op });
const p = (filhos, op = {}) => new Paragraph({ spacing: { after: 100 }, ...op, children: [].concat(filhos) });
const titulo = (texto, quebra = false) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: quebra,
  spacing: { before: 280, after: 120 }, children: [new TextRun({ text: texto, font: "Calibri", size: 28, bold: true, color: AZUL })] });
const subtitulo = (texto) => new Paragraph({ keepNext: true, spacing: { before: 160, after: 80 }, children: [t(texto, { bold: true })] });
const NATUREZA = { norma_expressa: "O que a norma estabelece", interpretacao: "Interpretação proposta",
  orientacao: "Segundo orientação institucional" };

function celula(conteudo, largura, { cabecalho = false, resposta = false } = {}) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA }, borders: bordas, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: cabecalho ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : resposta ? { type: ShadingType.CLEAR, fill: CAIXA, color: "auto" } : undefined,
    children: [].concat(conteudo).map((c) => new Paragraph({ children: [t(String(c), cabecalho ? { bold: true, color: "FFFFFF" } : { size: 20 })] })),
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
const marque = (opcoes, escolha = null) => p(t(opcoes.map((o) => `${o === escolha ? "☒" : "☐"}  ${o}`).join("     ")));

const modelo = rotuloModelo || resumo.modelo;
const corpo = [
  ...(sug ? [p(t(sug.aviso, { bold: true, color: "B42318" }))] : []),
  new Paragraph({ spacing: { after: 60 }, children: [t("PLATAFORMA DE CONSULTA ÉTICO-NORMATIVA — GPECSS", { bold: true, size: 20, color: "4F5D70" })] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `Atividade de conferência nº ${numAtividade}`, font: "Calibri", size: 40, bold: true, color: AZUL })] }),
  new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL, space: 6 } },
    children: [t(`Avaliação das respostas da IA local (${modelo}) — ${itens.length} perguntas`, { size: 26 })] }),
  titulo("Para que serve"),
  p(t("A plataforma pode, opcionalmente, redigir uma análise com inteligência artificial que roda no próprio computador da pessoa (sem custo e sem enviar a pergunta a servidores). Antes de liberar esse recurso ao público, é preciso que uma assistente social avalie se as respostas estão corretas.")),
  p(t("Cada frase da IA abaixo já passou por uma verificação automática: as citações entre « » existem literalmente nas fontes, e cada frase aponta os trechos que a fundamentam. E1, E2… são trechos de normas; O1, O2… são trechos de orientações do CFESS, dos CRESS ou da ABEPSS (cartilhas, notas técnicas, pareceres). A verificação automática NÃO garante que a frase esteja certa — é isso que você vai avaliar.")),
  ...(camada2 ? [
    p(t("Novidade desta versão: a IA também recebe as orientações institucionais (O1, O2…). Ela deve usá-las para explicar como as entidades aplicam as normas, sempre dizendo a fonte, e nunca como se fossem normas. Por isso a atividade tem duas partes.")),
    p([t("Parte A ", { bold: true }), t("(curta): diga se cada documento pode entrar na plataforma. "), t("Parte B: ", { bold: true }), t("avalie as respostas da IA, como antes.")]),
  ] : []),
  titulo("Como responder"),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Leia a pergunta e os trechos (E1, E2…) que a IA recebeu.")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("Em cada frase, marque: Correta (certa e bem fundamentada), Parcial (certa em parte, incompleta ou imprecisa) ou Incorreta (errada, enganosa ou sem base).")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, children: [t("No fim de cada pergunta, diga se a resposta ajudaria um/a profissional, docente ou estudante.")] }),
  new Paragraph({ numbering: { reference: "etapas", level: 0 }, spacing: { after: 160 }, children: [t("Pode usar apoio de outra IA para conferir as normas, mas as marcações ☒ são suas. Salve nesta pasta e me avise no chat.")] }),
  titulo("Números da verificação automática"),
  tabela([6638, 3000], ["Medida", "Valor"], [
    ["Perguntas", String(resumo.perguntas)],
    ["Perguntas com análise aceita", String(resumo.com_analise_aceita)],
    ["Frases aceitas pela verificação", String(resumo.afirmacoes_aceitas)],
    ["Frases descartadas pela verificação", `${resumo.afirmacoes_removidas} (${Math.round(resumo.taxa_remocao * 100)}%)`],
    ["Tempo médio por resposta", `${String(resumo.tempo_medio_s).replace(".", ",")} s`],
  ]),
];

if (camada2) {
  corpo.push(titulo("Parte A — Documentos de orientação institucional (camada 2)", true));
  corpo.push(p(t("São publicações oficiais e gratuitas. Já conferi automaticamente que cada trecho é cópia literal do PDF oficial. Falta a sua decisão: o documento é pertinente e pode orientar as respostas? Marque Incluir ou Não incluir. Se tiver dúvida sobre um documento, marque Não incluir e anote o motivo.")));
  corpo.push(tabela([500, 5600, 1400, 2138], ["Nº", "Documento", "Páginas / trechos", "Decisão"],
    camada2.map((d, k) => [String(k + 1), `${d.orgao}. ${d.titulo}${d.edicao ? ` (${d.edicao})` : ""}. ${d.ano || d.ano_texto || "s. d."}.`,
      `${d.paginas || "?"} p. / ${d.trechos || "?"}`,
      !sug ? "☐ Incluir   ☐ Não incluir" : sug.parteA.excecoes[d.id] ? `☐ Incluir   ☒ Não incluir — ${sug.parteA.excecoes[d.id]}` : "☒ Incluir   ☐ Não incluir"]), [3]));
  corpo.push(subtitulo("Os textos completos desses documentos ficam no arquivo público do site (como já acontece com as normas), para a busca funcionar sem servidor. Na tela, só aparecem os trechos encontrados, com a fonte e o link do PDF oficial. Você concorda?"));
  corpo.push(marque(["Sim", "Só os documentos do CFESS e dos CRESS", "Não: mostrar só o link"], sug?.parteA.reproducao));
  if (sug) corpo.push(notaSug(sug.parteA.reproducao_motivo), notaSug(`Faltantes: ${sug.parteA.faltantes}`));
  corpo.push(caixa("Algum documento oficial importante que ficou de fora (opcional):", 2));
  corpo.push(titulo("Parte B — Respostas da IA", true));
  corpo.push(p(t("Para cada pergunta: os trechos que a IA usou e as frases dela. As frases marcadas como “Segundo orientação institucional” vêm só das orientações (O1, O2…); confira se a IA disse a fonte e se não apresentou a orientação como regra.")));
}

itens.forEach((it, i) => {
  corpo.push(titulo(`Pergunta ${i + 1} (${it.id})`, !camada2 || i > 0));
  corpo.push(p(t(it.pergunta, { bold: true, size: 24 })));
  // Só os trechos que fundamentam as frases a avaliar (ou os 3 primeiros, se não houver frase).
  // Também os trechos mencionados nos aspectos de atenção (ex.: "(E3)"), para o revisor ver tudo o que a IA citou.
  const citados = new Set([...it.aceitas.flatMap((x) => x.evidencias || []),
    ...(it.atencao || []).flatMap((x) => x.match(/[EO]\d+/g) || [])]);
  const num = (id) => Number(String(id).slice(1)) + (String(id).startsWith("O") ? 100 : 0);
  // Orientações (O) recebidas aparecem sempre, usadas ou não: o revisor avalia se ajudariam.
  const mostrar = it.evidencias.filter((e) => e.camada === 2 || (!citados.size ? num(e.id) <= 3 : citados.has(e.id)))
    .sort((x, y) => num(x.id) - num(y.id));
  corpo.push(subtitulo(citados.size ? "Trechos usados pela IA" : "Primeiros trechos encontrados"));
  corpo.push(tabela([800, 2800, 6038], ["Ref.", "Dispositivo ou documento", "Texto"],
    mostrar.map((e) => [e.id, e.rotulo, e.texto.length > 600 ? e.texto.slice(0, 600) + "…" : e.texto])));
  corpo.push(subtitulo("O que a IA respondeu"));
  if (it.sintese) corpo.push(p([t("Síntese: ", { bold: true }), t(it.sintese)]));
  if (!it.aceitas.length) {
    corpo.push(p(t(it.erro
      ? `A IA não produziu resposta em formato válido (${it.erro}); a plataforma mostraria só os trechos.`
      : "Nenhuma frase da IA passou na verificação; a plataforma mostraria só os trechos (modo documental).", { italics: true })));
  }
  it.aceitas.forEach((a, k) => {
    corpo.push(p([t(`${k + 1}. `, { bold: true }), t(`[${NATUREZA[a.natureza] || a.natureza}] `, { color: "4F5D70" }),
      t(a.texto), t(`  (${(a.evidencias || []).join(", ")})`, { color: "4F5D70" })], { keepNext: true }));
    corpo.push(marque(["Correta", "Parcial", "Incorreta"], sug?.parteB[it.id]?.frases[k]));
  });
  if (it.atencao?.length) corpo.push(p([t("Aspectos de atenção apontados pela IA: ", { bold: true }), t(it.atencao.join(" "))]));
  corpo.push(subtitulo("A resposta, no conjunto, ajudaria um/a profissional, docente ou estudante?"));
  corpo.push(marque(["Sim", "Em parte", "Não", "Seria melhor mostrar só os trechos"], sug?.parteB[it.id]?.ajudaria));
  if (sug?.parteB[it.id]?.nota) corpo.push(notaSug(sug.parteB[it.id].nota));
  corpo.push(caixa("O que está errado, faltou ou poderia confundir (opcional):", 1));
});

corpo.push(titulo("Avaliação geral", true));
corpo.push(subtitulo("1. Com base nestas respostas, a análise por IA pode ser liberada ao público (sempre opcional e com o aviso de limites)?"));
corpo.push(marque(["Sim", "Sim, só depois de corrigir os pontos que anotei", "Ainda não"], sug?.geral.liberar));
if (sug) corpo.push(notaSug(sug.geral.erros));
corpo.push(subtitulo("2. Que tipo de erro mais preocupa?"));
corpo.push(caixa("Ex.: afirma como regra o que é interpretação; mistura norma revogada; responde além do que os trechos dizem…", 3));
if (camada2) {
  corpo.push(subtitulo("3. As orientações institucionais (O1, O2…) melhoraram as respostas?"));
  corpo.push(marque(["Sim", "Em parte", "Não", "Pioraram"], sug?.geral.orientacoes));
}
corpo.push(subtitulo(`${camada2 ? 4 : 3}. Algo que a IA deveria sempre dizer ou nunca dizer?`));
corpo.push(caixa("Sugestões para as instruções dadas à IA:", 3));
if (sug) corpo.push(notaSug(sug.geral.regras));

const doc = new Document({
  creator: "Plataforma de Consulta Ético-Normativa — GPECSS",
  title: `Atividade de conferência nº ${numAtividade} — avaliação da IA`,
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  numbering: { config: [{ reference: "etapas", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      t(`GPECSS · Consulta Ético-Normativa · Atividade nº ${numAtividade} (avaliação da IA) · página `, { size: 18, color: "6B7785" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: "6B7785" })] })] }) },
    children: corpo,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(destino, b); console.log("gerado:", destino); });

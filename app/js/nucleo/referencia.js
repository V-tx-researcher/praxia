// Referência bibliográfica (ABNT NBR 6023) e citação no texto (NBR 10520) de um
// documento do acervo ou de um dispositivo. Para estudantes, docentes e para
// relatórios e pareceres que precisam indicar a fonte.

const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export function dataAcesso(hoje = new Date()) {
  return `${hoje.getDate()} ${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`;
}

// Leis federais incluídas no acervo como partes do livreto do Código de Ética.
const LEIS = {
  "8662": {
    referencia: "BRASIL. Lei nº 8.662, de 7 de junho de 1993. Dispõe sobre a profissão de Assistente Social e dá outras " +
      "providências. Diário Oficial da União: seção 1, Brasília, DF, 8 jun. 1993.",
    autorData: ["BRASIL", "1993"],
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8662.htm",
  },
  "12317": {
    referencia: "BRASIL. Lei nº 12.317, de 26 de agosto de 2010. Acrescenta dispositivo à Lei nº 8.662, de 7 de junho de " +
      "1993, para dispor sobre a duração do trabalho do Assistente Social. Diário Oficial da União: seção 1, Brasília, DF, " +
      "27 ago. 2010.",
    autorData: ["BRASIL", "2010"],
    url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12317.htm",
  },
};

const CFESS = "CONSELHO FEDERAL DE SERVIÇO SOCIAL (Brasil)";

function dispositivoCurto(unidade) {
  if (!unidade || ["trecho", "apresentacao", "anexo"].includes(unidade.tipo)) return "";
  const r = unidade.rotulo.replace(/^Art\./, "art.").replace(/^Princípio fundamental/, "princípio");
  return r;
}

function numeroFormatado(n) {
  const v = Number(String(n).replace(/\./g, ""));
  return Number.isFinite(v) ? v.toLocaleString("pt-BR") : String(n);
}

// `doc` no formato do índice (acervo-*.json); `unidade` opcional.
export function referenciaABNT(doc, unidade = null, hoje = new Date()) {
  const acesso = `Acesso em: ${dataAcesso(hoje)}.`;
  const disp = dispositivoCurto(unidade);
  const lei = unidade && /^Lei nº ([\d.]+)/.exec(unidade.parte || "");
  if (lei && LEIS[lei[1].replace(/\./g, "")]) {
    const L = LEIS[lei[1].replace(/\./g, "")];
    return {
      referencia: `${L.referencia} Disponível em: ${L.url}. ${acesso}`,
      citacao: `(${L.autorData[0]}, ${L.autorData[1]}${disp ? `, ${disp}` : ""})`,
    };
  }
  // Camada 2 (D41): referência montada no pipeline a partir dos dados da publicação.
  if (doc.camada === 2 && doc.referencia) {
    const autor = doc.autoria ? doc.autoria.split(";")[0].split(",")[0].trim() : doc.orgao;
    const pag = unidade?.pagina_impressa || unidade?.pagina;
    return {
      referencia: `${doc.referencia} ${acesso}`,
      citacao: `(${autor}${doc.autoria?.includes(";") ? " et al." : ""}, ${doc.ano || "s. d."}${pag ? `, p. ${pag}` : ""})`,
    };
  }
  const url = doc.fonte_oficial_url || doc.fonteOficial || doc.arquivo_url;
  if (doc.tipo === "codigo_etica" || /^cfess-codigo-etica/.test(doc.id)) {
    return {
      referencia: `${CFESS}. Código de ética do/a assistente social. Lei 8.662/93 de regulamentação da profissão. ` +
        `10. ed. rev. e atual. Brasília, DF: CFESS, 2012. Disponível em: ${url}. ${acesso}`,
      citacao: `(CFESS, 2012${disp ? `, ${disp}` : ""})`,
    };
  }
  const tipo = doc.tipo === "orientacao_normativa" ? "Orientação Normativa CFESS" : "Resolução CFESS";
  let ementa = (doc.ementa || "").trim().replace(/\s+/g, " ");
  // Ementa toda em maiúsculas (ex.: Res. 533/2008) vira caixa de frase, preservando siglas.
  if (ementa && ementa === ementa.toUpperCase()) {
    ementa = ementa.toLowerCase().replace(/^./, (c) => c.toUpperCase())
      .replace(/\b(cfess|cress|cofi|sus|dou|cpf|art)\b/g, (s) => (s === "art" ? "art" : s.toUpperCase()));
  }
  ementa = ementa.replace(/\.?$/, ".");
  const compilada = /compilada/i.test(doc.titulo || "") ? " Versão compilada." : "";
  return {
    referencia: `${CFESS}. ${tipo} nº ${numeroFormatado(doc.numero)}/${doc.ano}. ${ementa}${compilada} ` +
      `Brasília, DF: CFESS, ${doc.ano}. Disponível em: ${url}. ${acesso}`,
    citacao: `(CFESS, ${doc.ano}${disp ? `, ${disp}` : ""})`,
  };
}

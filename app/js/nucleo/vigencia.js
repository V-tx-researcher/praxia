// Avaliação de vigência de um documento, inclusive para a época dos fatos.
// Nunca presume vigência: ausência de verificação é sempre sinalizada.

export function avaliarVigencia(doc, dataFatos = null, unidade = null) {
  const avisos = [];
  let aplicavel = null; // true | false | null (não determinável)
  // Situação do próprio dispositivo (registrada na conferência) vem primeiro: é a
  // informação mais específica para o trecho citado.
  if (unidade?.situacao_dispositivo) {
    avisos.push(`Este dispositivo: ${unidade.nota_vigencia}`);
    if (unidade.situacao_dispositivo === "revogado") {
      return { aplicavel: false, avisos, dispositivo: "revogado" };
    }
  }
  switch (doc.situacao) {
    case "vigente_confirmada":
      aplicavel = true;
      break;
    case "alterada":
      aplicavel = true;
      avisos.push(doc.nota_vigencia || "Documento com alterações posteriores: confira a redação vigente de cada dispositivo.");
      break;
    case "revogada":
      aplicavel = false;
      avisos.push("Documento revogado: serve apenas como referência histórica, salvo para fatos ocorridos durante sua vigência.");
      break;
    case "historica":
      aplicavel = false;
      avisos.push("Edição histórica: não corresponde à redação atual.");
      break;
    default:
      avisos.push("Vigência deste documento ainda não foi verificada pela equipe responsável. Confirme na fonte oficial.");
  }
  for (const indicacao of doc.indicacoes_portal || []) {
    avisos.push(`O portal oficial indica: "${indicacao}". Essa informação ainda não foi conferida pela equipe; não utilize este documento como norma vigente sem verificar.`);
    if (aplicavel === null) aplicavel = false;
  }
  if (dataFatos) {
    const inicio = doc.inicio_vigencia || doc.data_publicacao;
    const fim = (doc.alteracoes?.revogado_por?.[0]?.data) || null;
    if (inicio && dataFatos < inicio) {
      aplicavel = false;
      avisos.push(`Os fatos mencionados (${dataFatos.slice(0, 4)}) parecem anteriores ao início de vigência registrado (${inicio}).`);
    } else if (fim && dataFatos >= fim) {
      aplicavel = false;
      avisos.push(`Os fatos mencionados parecem posteriores à revogação registrada (${fim}).`);
    } else if (doc.situacao === "revogada" && fim && dataFatos < fim) {
      aplicavel = true;
      avisos.push("Documento hoje revogado, mas possivelmente vigente à época dos fatos.");
    } else if (!inicio) {
      avisos.push("Não há data de início de vigência registrada para comparar com a época dos fatos.");
    }
  }
  return { aplicavel, avisos };
}

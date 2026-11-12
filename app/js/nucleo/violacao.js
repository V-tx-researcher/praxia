// Modo Possível violação (D59): a pessoa relata uma situação que pode ferir o Código de Ética, a
// Lei 8.662/1993 ou as resoluções do CFESS. A PraxIA reúne os trechos que tratam do tema e SEMPRE
// recomenda o contato com a fiscalização (agente fiscal) do CRESS do território onde a profissional
// ou o profissional trabalha. A recomendação é montada aqui, sem IA, para aparecer mesmo quando a
// IA está desligada, sem cota ou sem consentimento.

import { ESTADOS, ufsCitadas } from "./busca.js";

const NOME_UF = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

// UFs do território citado. "Mato Grosso do Sul" também casa "mato grosso": fica só MS.
export function territorioCitado(pergunta) {
  const ufs = ufsCitadas(pergunta);
  if (ufs.has("MS")) ufs.delete("MT");
  return [...ufs].filter((uf) => ESTADOS[uf]).sort();
}

// Recomendação fixa de contato com a fiscalização. Não traz telefone nem endereço (mudam e não
// são conferidos pela PraxIA): indica como achar o contato oficial.
export function recomendacaoFiscalizacao(pergunta) {
  const ufs = territorioCitado(pergunta);
  const cress = ufs.map((uf) => ({ uf, sigla: `CRESS-${uf}`, estado: NOME_UF[uf],
    busca: `https://www.google.com/search?q=${encodeURIComponent(`CRESS-${uf} fiscalização seccional contato`)}` }));
  const quem = cress.length
    ? cress.map((c) => `${c.sigla} (${c.estado})`).join(" ou ")
    : "o CRESS do estado onde você trabalha";
  return {
    cress,
    titulo: "Isto pode ser uma possível violação: procure a fiscalização do CRESS",
    texto: `Recomendamos entrar em contato com a agente fiscal ou o agente fiscal da sede ou da seccional de ${quem} que atende a cidade onde você exerce a profissão. ` +
      "A fiscalização (COFI e seccionais) orienta, avalia a situação e indica o caminho certo, inclusive se cabe denúncia ou representação ética.",
    comoAchar: "Para achar o contato: procure no Google \"CRESS da sua região + fiscalização\" ou entre no site oficial ou nas redes oficiais do CRESS. " +
      "Confira se o endereço do site é mesmo do Conselho antes de enviar qualquer informação.",
    semUF: !cress.length,
  };
}

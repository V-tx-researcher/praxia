// Interpretação inicial da pergunta: natureza da situação e temas.
// Regras transparentes (palavras-chave), sem inferência por IA, para que a
// classificação seja auditável e reprodutível.

import { dobrarAcentos } from "./texto.js";

export const SITUACOES = {
  A: "Possível infração ética atribuída a assistente social",
  B: "Possível violação de condições éticas e técnicas de trabalho",
  C: "Dúvida geral sobre o exercício profissional",
};

const TEMAS = {
  sigilo_profissional: ["sigilo", "sigilos", "segredo", "confidencial", "revelar", "quebra de sigilo", "lacr"],
  atribuicoes_privativas: ["atribuic", "privativ", "so assistente social pode", "exclusiv"],
  competencias: ["competencia", "compete"],
  condicoes_eticas_tecnicas: ["condic", "sala", "espaco fisico", "privacidade", "atendimento individual", "arquivo", "material tecnico", "estrutura"],
  supervisao_estagio: ["estagi", "supervis", "aluno", "aluna", "estudante"],
  direitos_profissionais: ["direito do", "direito da", "direitos do", "tenho direito", "posso recusar", "posso me recusar"],
  deveres_profissionais: ["dever", "obrigad", "obrigacao", "devo"],
  vedacoes: ["vedad", "proibid", "nao pode", "posso", "e permitido", "permitid"],
  autonomia_profissional: ["autonomia", "liberdade", "independencia", "interferenc"],
  documentos_tecnicos: ["laudo", "parecer", "relatorio", "estudo social", "pericia", "perito", "documento"],
  relacoes_profissionais: ["colega", "equipe", "psicolog", "medic", "enfermeir", "multidisciplinar", "interdisciplinar", "chefia", "chefe", "gestor", "coordenador"],
  relacao_usuarios: ["usuari", "paciente", "familia", "atendid", "populacao"],
  fiscalizacao_profissional: ["fiscaliz", "cofi", "subcofi", "cress"],
  processo_etico: ["processo etico", "denuncia", "penalidade", "punic", "cassac", "advertencia", "multa", "infrac"],
  registro_inscricao: ["registro", "inscric", "carteira", "anuidade"],
};

// Indícios de que a pergunta descreve conduta de outro/a profissional (situação A).
const INDICIOS_A = [
  /\bcolega\b/, /\boutr[ao] assistente social\b/, /\b(?:uma|um|a|o|essa|esse|minha|meu) assistente social (?:\w+(?:ou|eu|iu)|esta|tem|vem|fez|faz|quer)\b/,
  /\binfring/, /\bantietic/, /\bdenunciar (?:a|o|uma|um) (?:colega|profissional|assistente)/, /\bconduta d[aoe]/,
  /\b(?:profissional|assistente social) (?:divulgou|revelou|expos|recusou|negou|agrediu|assinou)\b/,
];
const INDICIOS_B = [
  "condicoes de trabalho", "condicoes eticas", "condicoes etica", "sala", "espaco fisico", "sem privacidade",
  "instituicao exige", "instituicao determina", "chefia exige", "chefe exige", "gestor exige", "coordenacao exige",
  "me obrigam", "obrigam", "imposicao", "determinacao institucional", "arquivo", "material tecnico",
  "desvio de funcao", "fora das atribuicoes", "pressao", "meta",
  "me deu uma ordem", "deu uma ordem", "chefia mandou", "chefe mandou", "chefia determinou", "direcao exige", "direcao quer",
];

export function classificar(pergunta) {
  const t = " " + dobrarAcentos(pergunta.toLowerCase()).replace(/\s+/g, " ") + " ";
  const temas = Object.entries(TEMAS)
    .map(([tema, chaves]) => [tema, chaves.filter((c) => t.includes(c)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([tema]) => tema);
  const a = INDICIOS_A.filter((re) => re.test(t)).length;
  const b = INDICIOS_B.filter((c) => t.includes(c)).length;
  let situacao = "C";
  if (b > 0 && b >= a) situacao = "B";
  else if (a > 0) situacao = "A";
  const dataFatos = extrairDataFatos(pergunta);
  return { situacao, situacaoRotulo: SITUACOES[situacao], temas, dataFatos, indicios: { a, b } };
}

// Datas mencionadas como época dos fatos ("em 2009", "em março de 2010", "10/05/2008").
export function extrairDataFatos(pergunta) {
  const m1 = pergunta.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const m2 = pergunta.match(/\b(?:em|no ano de|desde|até|ate)\s+(?:\w+\s+de\s+)?((?:19|20)\d{2})\b/i);
  if (m2) return `${m2[1]}-12-31`;
  return null;
}

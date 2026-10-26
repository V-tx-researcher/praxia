// Detecção de dados pessoais na pergunta, antes de qualquer processamento.
// A consulta é processada apenas no navegador; ainda assim, orientamos a pessoa
// a não incluir dados identificáveis e mascaramos os que forem detectados.

const PADROES = [
  { tipo: "CPF", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { tipo: "CNPJ", re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { tipo: "número de processo judicial", re: /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g },
  { tipo: "e-mail", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { tipo: "telefone", re: /(?:\(?\b\d{2}\)?\s?)?\b9?\d{4}[-\s]?\d{4}\b/g },
  { tipo: "cartão SUS / NIS", re: /\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b|\b\d{11}\b/g },
  { tipo: "data de nascimento", re: /\bnascid[oa]s?\s+(?:em\s+)?\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi },
];

// Expressões que costumam anteceder o nome de uma pessoa atendida.
const NOME_APOS = /\b(?:usu[áa]ri[oa]|paciente|crian[çc]a|adolescente|idos[oa]|m[ãa]e|pai|senhor[a]?|sr\.?|sra\.?|chamad[oa]|de nome)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*)/g;

export function detectarDadosPessoais(texto) {
  const achados = [];
  for (const { tipo, re } of PADROES) {
    for (const m of texto.matchAll(re)) achados.push({ tipo, inicio: m.index, fim: m.index + m[0].length });
  }
  for (const m of texto.matchAll(NOME_APOS)) {
    const ini = m.index + m[0].length - m[1].length;
    achados.push({ tipo: "possível nome de pessoa", inicio: ini, fim: ini + m[1].length });
  }
  achados.sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
  // remove sobreposições
  const saida = [];
  for (const a of achados) if (!saida.length || a.inicio >= saida[saida.length - 1].fim) saida.push(a);
  return saida;
}

export function mascarar(texto, achados = detectarDadosPessoais(texto)) {
  let saida = "";
  let pos = 0;
  for (const a of achados) {
    saida += texto.slice(pos, a.inicio) + `[${a.tipo} removido]`;
    pos = a.fim;
  }
  return saida + texto.slice(pos);
}

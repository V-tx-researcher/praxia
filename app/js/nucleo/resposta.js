// Orquestração do pipeline de consulta e composição da resposta padronizada.
//
// Etapas: privacidade → interpretação/classificação → recuperação lexical →
// seleção de evidências → vigência → (LLM opcional) → verificação → composição.
// A recuperação semântica entra como etapa adicional quando habilitada
// (ver docs/NEXT_STEPS.md); sem ela o pipeline continua íntegro.

import { classificar } from "./classificacao.js";
import { detectarDadosPessoais, mascarar } from "./privacidade.js";
import { conferirEvidencias, selecionarEvidencias } from "./evidencias.js";
import { orientacaoPara } from "./orientacao.js";
import { verificarAnalise } from "./verificacao.js";
import { ASSUNTOS_ROTULOS } from "./rotulos.js";
import { fundir } from "./semantica.js";
import { ajustarNatureza, conferirOrientacoes, selecionarOrientacoes } from "./interpretacao.js";

export const LIMITES =
  "Esta é uma análise informativa, produzida por uma ferramenta independente de pesquisa, " +
  "com recuperação automática de documentos e, quando indicado, auxílio de inteligência artificial. " +
  "Pode conter erros ou omissões, não constitui manifestação do CFESS ou de qualquer CRESS e não " +
  "substitui pareceres, orientação, fiscalização ou deliberação dos órgãos competentes. " +
  "Leia integralmente as fontes indicadas.";

// A janela do modelo local (~4.000 tokens) precisa caber instruções, evidências e a
// resposta: as orientações vão para a IA só até este total de caracteres de trechos
// (na rodada de 28/10/2026, no máximo ~6.800 caracteres e 3.500 tokens de entrada).
export const ORCAMENTO_CARACTERES_IA = 6500;
const MAX_ORIENTACOES_IA = 2;
export function paraIA(evidencias, orientacoes) {
  let total = evidencias.reduce((s, e) => s + e.texto.length + e.contexto.reduce((c, x) => c + x.texto.length, 0), 0);
  const escolhidas = [];
  for (const o of orientacoes) {
    if (escolhidas.length >= MAX_ORIENTACOES_IA || total + o.texto.length > ORCAMENTO_CARACTERES_IA) break;
    escolhidas.push(o);
    total += o.texto.length;
  }
  return escolhidas;
}

// `semantica` (opcional): { indice: IndiceSemantico, motor: { vetor(pergunta) } }.
// `interpretacao` (opcional): IndiceLexical da camada 2 (orientações institucionais, D41).
export async function consultar(indice, perguntaOriginal, { motorLLM = null, semantica = null, interpretacao = null,
  aoProgresso = () => {} } = {}) {
  const etapas = [];
  const marcar = (nome, detalhe) => { etapas.push({ nome, detalhe }); aoProgresso(nome, detalhe); };

  const dados = detectarDadosPessoais(perguntaOriginal);
  const pergunta = dados.length ? mascarar(perguntaOriginal, dados) : perguntaOriginal;
  marcar("privacidade", dados.length ? `${dados.length} possível(is) dado(s) pessoal(is) mascarado(s)` : "nenhum dado pessoal detectado");

  const classificacao = classificar(pergunta);
  marcar("interpretação", `${classificacao.situacaoRotulo}; temas: ${classificacao.temas.map((t) => ASSUNTOS_ROTULOS[t] || t).join(", ") || "não identificados"}`);

  let busca = indice.buscar(pergunta, { limite: 40, dataFatos: classificacao.dataFatos });
  marcar("busca nos documentos", `${busca.resultados.length} dispositivos candidatos` +
    (busca.citadas?.alguma ? " (com prioridade para a norma citada na pergunta)" : ""));
  if (semantica) {
    try {
      const vetor = await semantica.motor.vetor(pergunta, semantica.indice.prefixo);
      busca = fundir(indice, busca, semantica.indice, vetor);
      const novos = busca.resultados.filter((r) => r.porSentido).length;
      marcar("busca por sentido", "ordem combinada com a busca por termos" +
        (novos ? `; ${novos} trecho(s) acrescentado(s) por proximidade de sentido` : ""));
    } catch (erro) {
      marcar("busca por sentido", `indisponível (${erro.message}); seguiu só a busca por termos`);
    }
  }

  let evidencias = selecionarEvidencias(indice, busca, { dataFatos: classificacao.dataFatos });
  evidencias = conferirEvidencias(indice, evidencias);
  marcar("trechos", `${evidencias.length} trechos selecionados e conferidos com o acervo`);

  // Orientações institucionais só acompanham uma resposta que já tem base normativa.
  let orientacoes = [];
  if (interpretacao && evidencias.length) {
    orientacoes = conferirOrientacoes(interpretacao, selecionarOrientacoes(interpretacao, pergunta));
    marcar("orientações institucionais", orientacoes.length
      ? `${orientacoes.length} trecho(s) de documentos do CFESS, dos CRESS ou da ABEPSS`
      : "nenhuma orientação diretamente relacionada");
  }

  let analise = null;
  if (motorLLM && evidencias.length) {
    marcar("análise", "gerando análise com o modelo local");
    try {
      let todas = [...evidencias, ...paraIA(evidencias, orientacoes)];
      let bruta;
      try {
        bruta = await motorLLM.analisar({ pergunta, classificacao, evidencias: todas });
      } catch (erro) {
        // Resposta cortada (janela do modelo cheia) chega como JSON incompleto: tenta de novo só com as normas.
        if (todas.length === evidencias.length || !/JSON/.test(erro.message)) throw erro;
        marcar("análise", "resposta incompleta; nova tentativa só com as normas");
        todas = [...evidencias];
        bruta = await motorLLM.analisar({ pergunta, classificacao, evidencias: todas });
      }
      analise = verificarAnalise(bruta, todas);
      ajustarNatureza(analise.afirmacoes, new Map(todas.map((e) => [e.id, e])));
      marcar("verificação", `${analise.afirmacoes.length} afirmações aceitas; ${analise.removidas.length} removidas`);
    } catch (erro) {
      marcar("análise", `falhou: ${erro.message}`);
      analise = { erro: erro.message };
    }
  }

  return compor({ perguntaOriginal, pergunta, dados, classificacao, busca, evidencias, orientacoes, analise, etapas,
    llmAtivo: !!motorLLM, indice });
}

export function compor({ pergunta, dados, classificacao, busca, evidencias, orientacoes = [], analise, etapas, llmAtivo, indice = null }) {
  const r = { pergunta, etapas, classificacao, secoes: [] };
  const docsUsados = new Map();
  const temNaoConferido = [...evidencias, ...orientacoes].some((e) => !e.documento.conferido);

  if (dados.length) {
    r.alertaPrivacidade = `Removemos da consulta ${dados.length} trecho(s) que parece(m) conter dado(s) pessoal(is) ` +
      `(${[...new Set(dados.map((d) => d.tipo))].join(", ")}). Para perguntas gerais, descreva a situação sem identificar pessoas.`;
  }

  // 1. Síntese da questão
  const temas = classificacao.temas.map((t) => ASSUNTOS_ROTULOS[t] || t);
  const sintese = analise?.sintese ||
    `Pergunta classificada como: ${classificacao.situacaoRotulo.toLowerCase()}` +
    (temas.length ? `. Temas identificados: ${temas.join("; ")}.` : ". Nenhum tema específico foi identificado automaticamente.");
  r.secoes.push({ id: "sintese", titulo: "Síntese da questão", paragrafos: [sintese] });

  if (!evidencias.length) {
    r.insuficiente = true;
    r.secoes.push({
      id: "analise", titulo: "Análise ético-normativa",
      paragrafos: [
        "Não foram encontrados, no acervo atualmente disponível, dispositivos suficientemente relacionados à pergunta para fundamentar uma análise.",
        "Isso não significa que a questão não tenha resposta normativa: o acervo ainda está em formação e pode não incluir o documento pertinente. Reformule a pergunta com termos das normas ou consulte o CRESS da sua região.",
      ],
    });
  } else if (analise && !analise.erro && analise.afirmacoes.length) {
    r.secoes.push({
      id: "analise", titulo: "Análise ético-normativa",
      afirmacoes: analise.afirmacoes,
      notaVerificacao: analise.removidas.length
        ? `${analise.removidas.length} afirmação(ões) gerada(s) pela IA foram removidas por não terem fundamentação verificável nas fontes.`
        : null,
    });
  } else {
    r.secoes.push({
      id: "analise", titulo: "Análise ético-normativa",
      paragrafos: [
        llmAtivo && analise?.erro
          ? "A análise por inteligência artificial não pôde ser concluída. Abaixo estão os dispositivos localizados, para leitura direta."
          : llmAtivo
            ? "A análise gerada pela inteligência artificial não passou na verificação de fundamentação e foi descartada. Abaixo estão os dispositivos localizados, para leitura direta."
            : "Modo documental: esta versão apresenta os dispositivos localizados, com seus textos literais, sem análise interpretativa por inteligência artificial.",
        "A seleção dos trechos é automática e baseada em correspondência de termos; a pertinência de cada um à sua situação concreta precisa ser avaliada na leitura.",
      ],
    });
  }

  // 3. Fundamentação documental
  if (evidencias.length) {
    const usadas = analise?.evidenciasUsadas?.length ? new Set(analise.evidenciasUsadas) : null;
    const lista = usadas ? evidencias.filter((e) => usadas.has(e.id)) : evidencias;
    for (const e of lista) docsUsados.set(e.documento.id, e);
    r.secoes.push({ id: "fundamentacao", titulo: "Fundamentação documental", evidencias: lista,
      outras: usadas ? evidencias.filter((e) => !usadas.has(e.id)) : [] });
  }

  // 3b. Orientações institucionais (camada 2): como o CFESS, os CRESS e a ABEPSS
  // interpretam e aplicam as normas. Separadas da fundamentação normativa.
  if (orientacoes.length) {
    const usadas = analise?.evidenciasUsadas?.length ? new Set(analise.evidenciasUsadas) : null;
    const citadas = usadas ? orientacoes.filter((o) => usadas.has(o.id)) : [];
    r.secoes.push({ id: "orientacoes", titulo: "Como as entidades da profissão orientam",
      paragrafos: ["Trechos de publicações do CFESS, dos CRESS e da ABEPSS (cartilhas, notas técnicas, pareceres e " +
        "parâmetros de atuação). Explicam como as entidades interpretam e aplicam as normas; não são normas e não " +
        "substituem a leitura dos dispositivos acima."],
      orientacoes: citadas.length ? [...citadas, ...orientacoes.filter((o) => !citadas.includes(o))] : orientacoes });
  }

  // 4. Aspectos que exigem atenção
  const atencao = [];
  if (temNaoConferido) atencao.push("PRÉVIA INTERNA: há trechos de documentos que ainda não foram conferidos pela equipe responsável. Não utilize esta resposta como referência.");
  const avisosVig = new Map();
  for (const e of evidencias) for (const a of e.vigencia.avisos) avisosVig.set(`${e.documento.id}|${a}`, `${e.documento.titulo}: ${a}`);
  atencao.push(...avisosVig.values());
  if (classificacao.dataFatos) atencao.push(`A pergunta menciona uma data (${classificacao.dataFatos.slice(0, 4)}). A redação aplicável deve ser a vigente à época dos fatos.`);
  if (classificacao.situacao !== "C") atencao.push("A aplicação das normas a um caso concreto depende de circunstâncias que esta ferramenta não conhece e não avalia.");
  if (analise?.aspectosAtencao) atencao.push(...analise.aspectosAtencao);
  if (analise?.lacunas?.length) atencao.push(...analise.lacunas.map((l) => `Informação não esclarecida: ${l}`));
  if (atencao.length) r.secoes.push({ id: "atencao", titulo: "Aspectos que exigem atenção", itens: atencao });

  // 5. Orientação institucional
  const o = orientacaoPara(classificacao.situacao, indice);
  r.secoes.push({ id: "orientacao", titulo: "Orientação institucional cabível", paragrafos: o.paragrafos, diferencas: o.diferencas, canais: o.canais, fundamentos: o.fundamentos });

  // 6. Limites
  r.secoes.push({ id: "limites", titulo: "Limites da ferramenta", paragrafos: [LIMITES] });

  // 7. Documentos para leitura integral
  if (docsUsados.size) {
    r.secoes.push({ id: "leitura", titulo: "Documentos para leitura integral",
      documentos: [...docsUsados.values()].map((e) => ({ ...e.documento, link: e.link.split("#")[0] })) });
  }
  return r;
}

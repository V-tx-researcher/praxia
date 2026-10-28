// Avaliação interna da LLM local (página de desenvolvimento; não implantar).
import { IndiceLexical } from "../js/nucleo/busca.js";
import { consultar } from "../js/nucleo/resposta.js";
import { MotorWebLLM } from "../js/llm/motor.js";

const log = (t) => { document.getElementById("log").textContent += t + "\n"; };
const p = new URLSearchParams(location.search);
const modelo = p.get("modelo");
const ids = (p.get("ids") || "").split(",").filter(Boolean);
// acervo=publico (padrão desde 28/10/2026, acervo nacional conferido) ou previa.
const arquivoAcervo = p.get("acervo") === "previa" ? "../dados/acervo-previa.json" : "../dados/acervo-publico.json";
const acervo = await (await fetch(arquivoAcervo)).json();
const perguntas = (await (await fetch("perguntas.json")).json()).perguntas.filter((q) => !ids.length || ids.includes(q.id));
const indice = new IndiceLexical(acervo);
// camada2=previa|publico: inclui as orientações institucionais (D41) na consulta.
const camada2 = p.get("camada2");
const interpretacao = camada2
  ? new IndiceLexical(await (await fetch(`../dados/interpretacao-${camada2 === "previa" ? "previa" : "publico"}.json`)).json())
  : null;
const motor = new MotorWebLLM(modelo, { aoProgresso: (t) => { window.progressoModelo = t; },
  usarIndexedDB: p.get("idb") === "1" ? true : null });
const t0 = performance.now();
await motor.carregar();
log(`modelo ${modelo} carregado em ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const resultados = [];
window.resultadoAvaliacao = { modelo, acervo: arquivoAcervo, camada2, carregamentoSegundos: +((performance.now() - t0) / 1000).toFixed(1),
  adaptador: await navigator.gpu?.requestAdapter().then((a) => a?.info && { vendor: a.info.vendor, arquitetura: a.info.architecture }).catch(() => null),
  concluido: false, resultados };
for (const q of perguntas) {
  const t = performance.now();
  const r = await consultar(indice, q.pergunta, { motorLLM: motor, interpretacao });
  const analise = r.secoes.find((s) => s.id === "analise");
  const fund = r.secoes.find((s) => s.id === "fundamentacao");
  const orient = r.secoes.find((s) => s.id === "orientacoes");
  const item = {
    id: q.id, comportamento: q.comportamento, pergunta: q.pergunta,
    segundos: +((performance.now() - t) / 1000).toFixed(1),
    evidencias: (fund?.evidencias || []).concat(fund?.outras || []).map((e) => `${e.id} ${e.parte} | ${e.rotulo}`),
    evidenciasEnviadas: (fund?.evidencias || []).concat(fund?.outras || []),
    orientacoesEnviadas: orient?.orientacoes || [],
    aceitas: analise?.afirmacoes || [],
    nota: analise?.notaVerificacao || null,
    paragrafos: analise?.paragrafos || null,
    etapas: r.etapas.map((e) => `${e.nome}: ${e.detalhe}`),
    saidaBruta: motor.ultimaSaidaBruta,
    uso: motor.ultimoUso,
  };
  resultados.push(item);
  log(`${q.id} (${item.segundos}s): ${item.aceitas.length} aceitas — ${item.nota || ""}`);
}
window.resultadoAvaliacao.concluido = true;
log("concluído");
  

// Avaliação interna da LLM local (página de desenvolvimento; não implantar).
import { IndiceLexical } from "../js/nucleo/busca.js";
import { consultar } from "../js/nucleo/resposta.js";
import { MotorWebLLM } from "../js/llm/motor.js";

const log = (t) => { document.getElementById("log").textContent += t + "\n"; };
const p = new URLSearchParams(location.search);
const modelo = p.get("modelo");
const ids = (p.get("ids") || "").split(",").filter(Boolean);
const acervo = await (await fetch("../dados/acervo-previa.json")).json();
const perguntas = (await (await fetch("perguntas.json")).json()).perguntas.filter((q) => !ids.length || ids.includes(q.id));
const indice = new IndiceLexical(acervo);
const motor = new MotorWebLLM(modelo, { aoProgresso: (t) => { window.progressoModelo = t; },
  usarIndexedDB: p.get("idb") === "1" ? true : null });
const t0 = performance.now();
await motor.carregar();
log(`modelo ${modelo} carregado em ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const resultados = [];
window.resultadoAvaliacao = { modelo, concluido: false, resultados };
for (const q of perguntas) {
  const t = performance.now();
  const r = await consultar(indice, q.pergunta, { motorLLM: motor });
  const analise = r.secoes.find((s) => s.id === "analise");
  const fund = r.secoes.find((s) => s.id === "fundamentacao");
  const item = {
    id: q.id, comportamento: q.comportamento, pergunta: q.pergunta,
    segundos: +((performance.now() - t) / 1000).toFixed(1),
    evidencias: (fund?.evidencias || []).concat(fund?.outras || []).map((e) => `${e.id} ${e.parte} | ${e.rotulo}`),
    evidenciasEnviadas: (fund?.evidencias || []).concat(fund?.outras || []),
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
  

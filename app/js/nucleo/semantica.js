// Busca por sentido (opcional, D36): compara o "vetor de sentido" da pergunta com os
// vetores dos trechos, calculados antes (scripts/semantica/gerar_vetores.mjs). Serve
// para achar trechos que tratam do mesmo assunto com outras palavras.
//
// Combinação com a busca por termos (fusão por posições, RRF): a busca por sentido
// só reordena e acrescenta candidatos. A regra de suficiência continua sendo a da
// busca por termos (evidencias.js): sem termos da pergunta no acervo, não há resposta.

const K_RRF = 60;
const MAX_SEMANTICOS = 40;
// Similaridade mínima (E5 normalizado) para um trecho entrar só pelo sentido.
export const SIM_MINIMA = 0.82;
// Peso da posição na busca por sentido em relação à busca por termos (1 = igual).
// Calibrado em 28/10/2026: 0,4 foi o melhor valor na avaliação (0,915 contra 0,907 só
// por termos) e melhorou perguntas em linguagem do dia a dia; 1 piorou (0,890).
export const PESO_SENTIDO = 0.4;

function base64ParaBytes(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export class IndiceSemantico {
  constructor(dados) {
    this.modelo = dados.modelo;
    this.dimensao = dados.dimensao;
    this.prefixo = dados.prefixo_consulta || "query: ";
    this.ids = dados.ids;
    const bytes = base64ParaBytes(dados.vetores);
    this.vetores = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (this.vetores.length !== this.ids.length * this.dimensao) throw new Error("vetores de sentido corrompidos");
  }

  // Similaridade de cosseno (vetores normalizados; int8 com escala 127).
  similaridades(consulta) {
    const n = this.ids.length;
    const d = this.dimensao;
    const sims = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      const base = i * d;
      for (let j = 0; j < d; j++) s += this.vetores[base + j] * consulta[j];
      sims[i] = s / 127;
    }
    return sims;
  }
}

// `busca` é o retorno de IndiceLexical.buscar; `vetor` é o vetor normalizado da pergunta.
export function fundir(indice, busca, semantico, vetor, { limite = 40, pesoSentido = PESO_SENTIDO, simMinima = SIM_MINIMA } = {}) {
  const sims = semantico.similaridades(vetor);
  const citadas = busca.citadas || { docs: new Set(), partes: new Set() };
  const candidatos = [];
  semantico.ids.forEach((id, i) => {
    const u = indice.porId.get(id);
    if (!u || sims[i] < simMinima - 0.06) return;
    candidatos.push({ unidade: u, sim: sims[i], ajustada: sims[i] * indice.fator(u, citadas, !!busca.passado) });
  });
  candidatos.sort((a, b) => b.ajustada - a.ajustada);
  const semanticos = candidatos.slice(0, MAX_SEMANTICOS);

  const posLex = new Map(busca.resultados.map((r, i) => [r.unidade.id, i]));
  const posSem = new Map(semanticos.map((r, i) => [r.unidade.id, i]));
  const simPorId = new Map(semanticos.map((r) => [r.unidade.id, r.sim]));
  const fundidos = new Map();
  for (const r of busca.resultados) fundidos.set(r.unidade.id, { ...r });
  for (const r of semanticos) {
    if (fundidos.has(r.unidade.id) || r.sim < simMinima) continue;
    // Entrou só pelo sentido: sem termos casados; não conta para a suficiência.
    fundidos.set(r.unidade.id, { unidade: r.unidade, casados: [], porSinonimo: false, porSentido: true,
      cobertura: 0, informativosCasados: 0 });
  }
  for (const [id, r] of fundidos) {
    const a = posLex.has(id) ? 1 / (K_RRF + posLex.get(id)) : 0;
    const b = posSem.has(id) ? pesoSentido / (K_RRF + posSem.get(id)) : 0;
    r.pontuacao = a + b;
    r.similaridade = simPorId.get(id) ?? null;
  }
  const resultados = [...fundidos.values()].sort((x, y) => y.pontuacao - x.pontuacao).slice(0, limite);
  return { ...busca, resultados, semantica: true };
}

// Motor no navegador: carrega a biblioteca e o modelo sob demanda (só quando a pessoa
// ativa a busca por sentido) e calcula o vetor da pergunta.
export const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";
export const TAMANHO_MODELO_MB = 120;

export class MotorSemantico {
  constructor(modelo, { aoProgresso = () => {} } = {}) {
    this.modelo = modelo;
    this.aoProgresso = aoProgresso;
    this.extrator = null;
  }

  async carregar() {
    if (this.extrator) return;
    const lib = await import(/* @vite-ignore */ TRANSFORMERS_URL);
    lib.env.allowLocalModels = false;
    this.extrator = await lib.pipeline("feature-extraction", this.modelo, {
      dtype: "q8",
      progress_callback: (p) => {
        if (p.status === "progress" && p.total) this.aoProgresso(p.loaded / p.total, p.file);
      },
    });
  }

  async vetor(pergunta, prefixo = "query: ") {
    await this.carregar();
    const t = await this.extrator(prefixo + pergunta, { pooling: "mean", normalize: true });
    return Float32Array.from(t.data);
  }
}

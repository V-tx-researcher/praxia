// Motor de LLM local via WebLLM (execução no navegador, com WebGPU).
// Nenhuma pergunta sai do dispositivo: o navegador baixa apenas o programa (WebLLM)
// e os pesos do modelo, que ficam em cache local.

import { ESQUEMA_SAIDA, interpretarSaida, montarMensagens } from "./prompt.js";

export const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm";

// Modelos avaliados ou em avaliação (ver docs/EVALUATION.md). Tamanhos conferidos
// nos repositórios mlc-ai do Hugging Face em 26/10/2026. Quais ficam disponíveis
// para ativação é definido em config.js (decisão D17).
//   memoriaMB: memória de vídeo estimada pelo WebLLM; downloadMB: soma dos arquivos;
//   maiorFragmentoMiB: maior arquivo individual (alguns navegadores recusam > ~256 MiB).
export const MODELOS = {
  "Qwen3-4B-q4f16_1-MLC": { rotulo: "Qwen3 4B", memoriaMB: 3432, downloadMB: 2155, maiorFragmentoMiB: 185,
    licenca: "Apache-2.0", segundosResposta: 23, avaliacao: "avaliado em 26/10/2026: citações fiéis, pertinência insuficiente" },
  "Qwen3-8B-q4f16_1-MLC": { rotulo: "Qwen3 8B", memoriaMB: 5696, downloadMB: 4396, maiorFragmentoMiB: 297,
    licenca: "Apache-2.0", segundosResposta: null, avaliacao: "em avaliação" },
  "Qwen3.5-4B-q4f16_1-MLC": { rotulo: "Qwen3.5 4B", memoriaMB: 3868, downloadMB: 2260, maiorFragmentoMiB: 303,
    licenca: "Apache-2.0", segundosResposta: null, avaliacao: "em avaliação" },
  "Qwen3.5-9B-q4f16_1-MLC": { rotulo: "Qwen3.5 9B", memoriaMB: 6433, downloadMB: 4807, maiorFragmentoMiB: 485,
    licenca: "Apache-2.0", segundosResposta: null, avaliacao: "em avaliação" },
  "Qwen2.5-7B-Instruct-q4f16_1-MLC": { rotulo: "Qwen2.5 7B Instruct", memoriaMB: 5107, downloadMB: 4082, maiorFragmentoMiB: 260,
    licenca: "Apache-2.0", segundosResposta: null, avaliacao: "em avaliação" },
};

export function webgpuDisponivel() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

let bibliotecaCarregada = null;
// Carrega a biblioteca WebLLM uma única vez (só quando a pessoa abre o painel de IA).
export function carregarBiblioteca() {
  bibliotecaCarregada ||= import(/* @vite-ignore */ WEBLLM_URL);
  return bibliotecaCarregada;
}

export class MotorWebLLM {
  constructor(modelo, { aoProgresso = () => {}, temperatura = 0, usarIndexedDB = null } = {}) {
    this.usarIndexedDB = usarIndexedDB;
    if (!MODELOS[modelo]) throw new Error(`modelo não avaliado: ${modelo}`);
    this.modelo = modelo;
    this.aoProgresso = aoProgresso;
    this.temperatura = temperatura;
    this.motor = null;
  }

  async carregar() {
    if (this.motor) return this.motor;
    if (!webgpuDisponivel()) throw new Error("este navegador não oferece WebGPU");
    const webllm = await carregarBiblioteca();
    const criar = (indexedDB) => webllm.CreateMLCEngine(this.modelo, {
      appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: indexedDB ? "indexeddb" : "cache" },
      initProgressCallback: (p) => this.aoProgresso(p.text, p.progress),
    });
    try {
      this.motor = await criar(this.usarIndexedDB ?? false);
    } catch (erro) {
      // Alguns navegadores falham ao gravar fragmentos grandes no Cache Storage
      // ("Failed to execute 'add' on 'Cache'"). O IndexedDB é a alternativa do WebLLM.
      if (this.usarIndexedDB || !/cache/i.test(String(erro?.message || erro))) throw erro;
      this.aoProgresso("armazenamento alternativo (IndexedDB)", 0);
      this.usarIndexedDB = true;
      this.motor = await criar(true);
    }
    return this.motor;
  }

  // Libera a memória de vídeo; os arquivos baixados permanecem no navegador.
  async descarregar() {
    try {
      await this.motor?.unload();
    } finally {
      this.motor = null;
    }
  }

  async analisar({ pergunta, classificacao, evidencias }) {
    const motor = await this.carregar();
    const mensagens = montarMensagens({ pergunta, classificacao, evidencias });
    const pedido = {
      messages: mensagens,
      temperature: this.temperatura,
      max_tokens: 1200,
      response_format: { type: "json_object", schema: JSON.stringify(ESQUEMA_SAIDA) },
    };
    if (this.modelo.startsWith("Qwen3")) {
      // Desativa o modo de raciocínio estendido: a saída deve ser apenas o JSON.
      pedido.extra_body = { enable_thinking: false };
    }
    const r = await motor.chat.completions.create(pedido);
    this.ultimaSaidaBruta = r.choices?.[0]?.message?.content ?? "";
    this.ultimoUso = r.usage;
    return interpretarSaida(this.ultimaSaidaBruta);
  }
}

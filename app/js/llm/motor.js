// Motor de LLM local via WebLLM (execução no navegador, com WebGPU).
// Nenhuma pergunta sai do dispositivo: o navegador baixa apenas o programa (WebLLM)
// e os pesos do modelo, que ficam em cache local.

import { ESQUEMA_SAIDA, interpretarSaida, montarMensagens } from "./prompt.js";

export const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm";

// Modelos avaliados (ver docs/EVALUATION.md). Nenhum está habilitado por padrão
// até a decisão registrada em docs/DECISIONS.md.
export const MODELOS = {
  "Qwen3.5-4B-q4f16_1-MLC": { rotulo: "Qwen3.5 4B", memoriaMB: 3868, licenca: "Apache-2.0" },
  "Qwen3.5-9B-q4f16_1-MLC": { rotulo: "Qwen3.5 9B", memoriaMB: 6433, licenca: "Apache-2.0" },
  "Qwen3-4B-q4f16_1-MLC": { rotulo: "Qwen3 4B", memoriaMB: 3432, licenca: "Apache-2.0" },
  "Qwen3-8B-q4f16_1-MLC": { rotulo: "Qwen3 8B", memoriaMB: 5696, licenca: "Apache-2.0" },
  "Qwen2.5-7B-Instruct-q4f16_1-MLC": { rotulo: "Qwen2.5 7B Instruct", memoriaMB: 5107, licenca: "Apache-2.0" },
  "Qwen3.5-2B-q4f16_1-MLC": { rotulo: "Qwen3.5 2B", memoriaMB: 2245, licenca: "Apache-2.0" },
};

export function webgpuDisponivel() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
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
    const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
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

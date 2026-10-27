// Configuração da implantação. Alterações aqui devem ser registradas em docs/DECISIONS.md.
export const CONFIG = {
  // Índice carregado por padrão. "previa" só é aceito em ambiente local (ver app.js).
  acervoPadrao: "publico",
  llm: {
    // D17: a análise por IA é ligada ou desligada pela própria pessoa, após ver o
    // diagnóstico do seu dispositivo. Na versão pública a ativação fica bloqueada
    // até cumprir os critérios mínimos (docs/NEXT_STEPS.md); em localhost é liberada
    // para teste.
    permitirAtivacao: false,
    // Modelos oferecidos no painel, em ordem de preferência.
    modelos: ["Qwen3-4B-q4f16_1-MLC"],
    // Em teste local, todos os modelos em avaliação aparecem no painel.
    modelosTesteLocal: ["Qwen3-4B-q4f16_1-MLC", "Qwen3-8B-q4f16_1-MLC", "Qwen3.5-4B-q4f16_1-MLC",
      "Qwen3.5-9B-q4f16_1-MLC", "Qwen2.5-7B-Instruct-q4f16_1-MLC"],
  },
};

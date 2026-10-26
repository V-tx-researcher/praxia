// Configuração da implantação. Alterações aqui devem ser registradas em docs/DECISIONS.md.
export const CONFIG = {
  // Índice carregado por padrão. "previa" só é aceito em ambiente local (ver app.js).
  acervoPadrao: "publico",
  // Análise interpretativa por LLM local. Desabilitada até a conclusão da avaliação
  // (docs/EVALUATION.md) e da decisão sobre o modelo (docs/DECISIONS.md).
  llm: { habilitado: false, modelo: null },
};

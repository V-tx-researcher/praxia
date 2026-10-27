// Diagnóstico do dispositivo para a análise por IA local (decisão D17).
// Mostra à pessoa usuária, antes de ativar, o que o modelo exige e o que o
// aparelho oferece. Os limites medidos são indicativos: o navegador pode recusar
// mesmo quando o diagnóstico é favorável, e o contrário também pode ocorrer.

import { MODELOS } from "./motor.js";

const MB = 1024 * 1024;

// Tamanho em GB com vírgula decimal ("2,1 GB" a partir de MiB).
export function gb(mb) {
  return `${(mb / 1024).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`;
}

// Coleta as informações disponíveis no navegador (todas opcionais).
export async function coletarDispositivo(nav = globalThis.navigator) {
  const info = { webgpu: false, adaptador: false, shaderF16: false, maxBufferMB: null,
    memoriaRAMGB: null, cotaMB: null, usoMB: null, fabricante: null };
  try {
    info.memoriaRAMGB = nav?.deviceMemory ?? null; // Chrome informa até 8 (valor arredondado)
    if (nav?.storage?.estimate) {
      const e = await nav.storage.estimate();
      info.cotaMB = e.quota != null ? Math.round(e.quota / MB) : null;
      info.usoMB = e.usage != null ? Math.round(e.usage / MB) : null;
    }
    if (nav?.gpu) {
      info.webgpu = true;
      const a = await nav.gpu.requestAdapter();
      if (a) {
        info.adaptador = true;
        info.shaderF16 = a.features?.has?.("shader-f16") ?? false;
        info.maxBufferMB = a.limits?.maxBufferSize ? Math.round(a.limits.maxBufferSize / MB) : null;
        info.fabricante = a.info?.vendor || null;
      }
    }
  } catch {
    // Diagnóstico parcial: segue com o que foi possível obter.
  }
  return info;
}

// Avalia um modelo para o dispositivo. Função pura (testável).
// Retorna { situacao: "apto" | "incerto" | "inapto", itens: [{ ok, texto }] }.
export function avaliarModelo(idModelo, dispositivo, { jaBaixado = false } = {}) {
  const m = MODELOS[idModelo];
  const itens = [];
  let inapto = false;
  let incerto = false;
  const add = (ok, texto, grave = true) => {
    itens.push({ ok, texto });
    if (ok === false) { if (grave) inapto = true; else incerto = true; }
    if (ok === null) incerto = true;
  };

  add(dispositivo.webgpu && dispositivo.adaptador,
    dispositivo.webgpu && dispositivo.adaptador
      ? `Aceleração gráfica (WebGPU) disponível${dispositivo.fabricante ? ` — ${dispositivo.fabricante}` : ""}.`
      : "Este navegador ou aparelho não oferece WebGPU. Use Chrome ou Edge atualizados em um computador.");
  if (dispositivo.adaptador && !dispositivo.shaderF16) {
    add(false, "A placa de vídeo não informa suporte a cálculo em meia precisão (shader-f16); o modelo pode não funcionar.", false);
  }

  if (jaBaixado) {
    add(true, `Modelo já baixado neste navegador (${gb(m.downloadMB)}).`);
  } else if (dispositivo.cotaMB == null) {
    add(null, `Não foi possível medir o espaço disponível. Download necessário: ${gb(m.downloadMB)}.`);
  } else {
    const livre = dispositivo.cotaMB - (dispositivo.usoMB || 0);
    const folga = livre - m.downloadMB;
    add(folga > 500,
      `Download de ${gb(m.downloadMB)}; espaço disponível para este site: ${gb(livre)}.` +
      (folga > 500 ? "" : " Espaço insuficiente: libere espaço no disco ou use outro navegador."));
  }

  if (dispositivo.maxBufferMB != null && dispositivo.maxBufferMB < m.maiorFragmentoMiB) {
    add(false, `A placa de vídeo aceita blocos de até ${dispositivo.maxBufferMB} MB; o modelo precisa de ${m.maiorFragmentoMiB} MB.`);
  }
  if (m.maiorFragmentoMiB > 250) {
    add(null, `Este modelo tem arquivos de até ${m.maiorFragmentoMiB} MB; alguns navegadores recusam guardar arquivos acima de cerca de 256 MB.`);
  }

  add(null, `Memória de vídeo estimada: ${gb(m.memoriaMB)}. O navegador não informa a memória da placa; ` +
    "em computadores com pouca memória o carregamento pode falhar ou o sistema ficar lento.");
  if (dispositivo.memoriaRAMGB != null && dispositivo.memoriaRAMGB < 8) {
    add(false, `O navegador informa cerca de ${dispositivo.memoriaRAMGB} GB de memória RAM; recomenda-se 8 GB ou mais.`, false);
  }
  add(null, `Tempo de resposta medido em computador com placa de vídeo dedicada: ~${m.segundosResposta ?? "?"} s por pergunta; pode ser bem maior em outros aparelhos.`);

  return { situacao: inapto ? "inapto" : incerto ? "incerto" : "apto", itens };
}

// Verifica se os arquivos do modelo já estão no cache do navegador.
// Verifica nos dois armazenamentos possíveis (Cache Storage e IndexedDB — ver D16).
export async function modeloBaixado(idModelo, webllm) {
  for (const backend of ["cache", "indexeddb"]) {
    try {
      if (await webllm.hasModelInCache(idModelo, { ...webllm.prebuiltAppConfig, cacheBackend: backend })) return true;
    } catch {
      // armazenamento indisponível: tenta o próximo
    }
  }
  return false;
}

// Remove os arquivos do modelo dos dois armazenamentos (libera espaço).
export async function removerModelo(idModelo, webllm) {
  for (const backend of ["cache", "indexeddb"]) {
    try {
      await webllm.deleteModelAllInfoInCache(idModelo, { ...webllm.prebuiltAppConfig, cacheBackend: backend });
    } catch {
      // nada a remover neste armazenamento
    }
  }
}

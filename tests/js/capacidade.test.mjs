// Testes do diagnóstico de dispositivo para a IA opcional (decisão D17).
import test from "node:test";
import assert from "node:assert/strict";

import { avaliarModelo, coletarDispositivo } from "../../app/js/llm/capacidade.js";

const BOM = { webgpu: true, adaptador: true, shaderF16: true, maxBufferMB: 2048, memoriaRAMGB: 8,
  cotaMB: 7000, usoMB: 500, fabricante: "amd" };

test("dispositivo adequado: apto ou incerto, nunca inapto", () => {
  const a = avaliarModelo("Qwen3-4B-q4f16_1-MLC", BOM);
  assert.notEqual(a.situacao, "inapto");
  assert.ok(a.itens.some((i) => /WebGPU/.test(i.texto) && i.ok === true));
});

test("sem WebGPU: inapto", () => {
  const a = avaliarModelo("Qwen3-4B-q4f16_1-MLC", { ...BOM, webgpu: false, adaptador: false });
  assert.equal(a.situacao, "inapto");
});

test("espaço insuficiente: inapto, com explicação", () => {
  const a = avaliarModelo("Qwen3-4B-q4f16_1-MLC", { ...BOM, cotaMB: 2000, usoMB: 0 });
  assert.equal(a.situacao, "inapto");
  assert.ok(a.itens.some((i) => i.ok === false && /Espaço insuficiente/.test(i.texto)));
});

test("modelo já baixado dispensa espaço para download", () => {
  const a = avaliarModelo("Qwen3-4B-q4f16_1-MLC", { ...BOM, cotaMB: 100, usoMB: 90 }, { jaBaixado: true });
  assert.notEqual(a.situacao, "inapto");
});

test("fragmentos grandes geram alerta de compatibilidade", () => {
  const a = avaliarModelo("Qwen3.5-9B-q4f16_1-MLC", { ...BOM, cotaMB: 20000 });
  assert.ok(a.itens.some((i) => i.ok === null && /256 MB/.test(i.texto)));
  const b = avaliarModelo("Qwen3.5-9B-q4f16_1-MLC", { ...BOM, cotaMB: 20000, maxBufferMB: 256 });
  assert.equal(b.situacao, "inapto");
});

test("coleta tolera navegador sem APIs (ex.: Node)", async () => {
  const d = await coletarDispositivo({});
  assert.equal(d.webgpu, false);
  assert.equal(d.cotaMB, null);
});

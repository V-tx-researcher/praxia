// Testes dos recursos de usabilidade: normas citadas, referência ABNT, guia e uso offline.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { IndiceLexical } from "../../app/js/nucleo/busca.js";
import { normasCitadas } from "../../app/js/nucleo/normas-citadas.js";
import { referenciaABNT, dataAcesso } from "../../app/js/nucleo/referencia.js";
import { EXEMPLOS, GLOSSARIO } from "../../app/js/nucleo/guia.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Acervo sintético mínimo.
const doc = (id, numero, ano, situacao, tipo = "resolucao") => ({ id, titulo: `Resolução ${numero}/${ano}`, tipo,
  tipo_rotulo: "Resolução", orgao: "CFESS", numero, ano, situacao, situacao_rotulo: situacao, conferido: true,
  ementa: "Dispõe sobre a supervisão de estágio", fonte_oficial_url: `https://exemplo.invalid/${id}`, partes: [], alteracoes: {} });
const ACERVO = {
  documentos: [doc("cfess-resolucao-533-2008", "533", 2008, "vigente_confirmada"),
    doc("cfess-resolucao-559-2009", "559", 2009, "sem_efeito_judicial"),
    { ...doc("cfess-codigo-etica-1993", null, 1993, "alterada", "codigo_etica"), titulo: "Código de Ética" }],
  unidades: [
    { id: "cfess-resolucao-533-2008#texto:art-3", doc: "cfess-resolucao-533-2008", parte: "Resolução 533/2008", tipo: "artigo",
      rotulo: "Art. 3º", pai: null, pagina: 2, texto: "Art. 3º O perito supervisor de estágio acompanha a atuação." },
    { id: "cfess-resolucao-559-2009#texto:art-1", doc: "cfess-resolucao-559-2009", parte: "Resolução 559/2009", tipo: "artigo",
      rotulo: "Art. 1º", pai: null, pagina: 2, texto: "Art. 1º A atuação do perito em escuta de crianças." },
    { id: "cfess-codigo-etica-1993#lei:art-5:inc-4", doc: "cfess-codigo-etica-1993", parte: "Lei nº 8.662/1993", tipo: "inciso",
      rotulo: "Art. 5º, inciso IV", pai: null, pagina: 45, texto: "IV - realizar vistorias, perícias técnicas, laudos periciais." },
  ],
};
const indice = new IndiceLexical(ACERVO);

test("normas citadas: resolução por número/ano, número solto e lei", () => {
  assert.deepEqual([...normasCitadas("O que diz a Res. CFESS nº 533/2008?", indice).docs], ["cfess-resolucao-533-2008"]);
  assert.deepEqual([...normasCitadas("a 559/2009 está válida?", indice).docs], ["cfess-resolucao-559-2009"]);
  assert.deepEqual([...normasCitadas("segundo a Lei 8.662/93", indice).partes], ["Lei nº 8.662/1993"]);
  assert.equal(normasCitadas("posso atender em 2009?", indice).alguma, false);
});

test("norma citada sobe ao topo e perde a penalidade de vigência", () => {
  const pont = (q) => indice.buscar(q).resultados.find((r) => r.unidade.doc === "cfess-resolucao-559-2009")?.pontuacao ?? 0;
  const com = indice.buscar("atuação do perito (559/2009)").resultados;
  assert.equal(com[0].unidade.doc, "cfess-resolucao-559-2009");
  assert.ok(pont("atuação do perito (559/2009)") > 3 * pont("atuação do perito"));
});

test("termos gerais do domínio não bastam para haver evidência", () => {
  const r = indice.buscar("piso salarial nacional do assistente social");
  assert.ok(r.resultados.every((x) => x.informativosCasados === 0) || r.resultados.length === 0);
});

test("referência ABNT: resolução, Código de Ética e Lei 8.662", () => {
  const hoje = new Date(2026, 9, 28);
  assert.equal(dataAcesso(hoje), "28 out. 2026");
  const res = referenciaABNT(indice.documentos.get("cfess-resolucao-533-2008"), ACERVO.unidades[0], hoje);
  assert.match(res.referencia, /^CONSELHO FEDERAL DE SERVIÇO SOCIAL \(Brasil\)\. Resolução CFESS nº 533\/2008\./);
  assert.match(res.referencia, /Acesso em: 28 out\. 2026\.$/);
  assert.equal(res.citacao, "(CFESS, 2008, art. 3º)");
  const lei = referenciaABNT(indice.documentos.get("cfess-codigo-etica-1993"), ACERVO.unidades[2], hoje);
  assert.match(lei.referencia, /^BRASIL\. Lei nº 8\.662, de 7 de junho de 1993\./);
  assert.equal(lei.citacao, "(BRASIL, 1993, art. 5º, inciso IV)");
  const cep = referenciaABNT(indice.documentos.get("cfess-codigo-etica-1993"), null, hoje);
  assert.equal(cep.citacao, "(CFESS, 2012)");
});

test("guia: exemplos e glossário preenchidos, glossário em ordem alfabética", () => {
  assert.ok(EXEMPLOS.length >= 3 && EXEMPLOS.every((g) => g.perguntas.length >= 2));
  const termos = GLOSSARIO.map(([t]) => t);
  assert.deepEqual(termos, [...termos].sort((a, b) => a.localeCompare(b, "pt-BR")));
});

test("uso sem internet: o service worker guarda todos os arquivos da aplicação, e só arquivos que existem", () => {
  const sw = fs.readFileSync(path.join(RAIZ, "app/sw.js"), "utf8");
  const listados = new Set([...sw.matchAll(/"([\w./-]+\.(?:js|css|png|svg|json|webmanifest|html))"/g)].map((m) => m[1]));
  for (const pasta of ["js", "js/nucleo", "js/llm", "icones"]) {
    for (const f of fs.readdirSync(path.join(RAIZ, "app", pasta))) {
      if (fs.statSync(path.join(RAIZ, "app", pasta, f)).isFile()) assert.ok(listados.has(`${pasta}/${f}`), `${pasta}/${f}`);
    }
  }
  for (const f of ["index.html", "css/style.css", "manifest.webmanifest", "dados/acervo-publico.json"]) assert.ok(listados.has(f), f);
  // Tudo o que está listado precisa existir, senão a instalação do service worker falha inteira.
  for (const f of listados) assert.ok(fs.existsSync(path.join(RAIZ, "app", f)), `listado mas inexistente: ${f}`);
});

test("compatibilidade: código do app sem recursos que quebram Safari/iOS antigos", () => {
  const arquivos = ["js", "js/nucleo", "js/llm"].flatMap((p) =>
    fs.readdirSync(path.join(RAIZ, "app", p)).filter((f) => f.endsWith(".js")).map((f) => path.join(RAIZ, "app", p, f)));
  for (const f of arquivos) {
    const codigo = fs.readFileSync(f, "utf8");
    // Lookbehind em expressão regular: Safari < 16.4 rejeita o módulo inteiro.
    assert.ok(!/\(\?<[!=]/.test(codigo), `lookbehind em ${path.basename(f)}`);
    for (const recurso of ["structuredClone(", ".findLast(", ".toSorted(", "Object.groupBy("]) {
      assert.ok(!codigo.includes(recurso), `${recurso} em ${path.basename(f)}`);
    }
  }
});

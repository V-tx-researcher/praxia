// PraxIA — intermediário do chat (Cloudflare Worker, plano gratuito). D44.
// Guarda a chave do Gemini (Secret GEMINI_API_KEY) fora do navegador e repassa ao Gemini só a
// pergunta e os trechos oficiais que a busca local já escolheu (nunca o acervo inteiro).
// Não grava perguntas nem respostas. Sem cobrança: no limite gratuito, devolve aviso (429).
//
// Variáveis no painel do Cloudflare:
//   GEMINI_API_KEY  (Secret, obrigatória)  — chave do Google AI Studio, nível gratuito
//   MODELO          (Text, opcional)       — padrão abaixo
//   ORIGENS         (Text, opcional)       — sites autorizados, separados por vírgula
//   LIMITES         (KV namespace, recomendado) — contador gratuito de uso diário
//   TETO_DIA        (Text, opcional)       — perguntas por dia no total (padrão 400)
//   TETO_PESSOA     (Text, opcional)       — perguntas por dia por pessoa (padrão 15)
//
// Gratuidade: a chave está no nível gratuito do Google (sem faturamento), então nada pode ser
// cobrado; os tetos abaixo só repartem a cota gratuita entre as pessoas e param ANTES de ela
// acabar. O contador usa o KV gratuito (1.000 gravações/dia: 2 por pergunta → teto 400 cabe).
// Se o contador falhar, o chat se recusa a responder (falha fechada), nunca passa do limite.
// A pessoa é contada por um código embaralhado do endereço de rede + data; o endereço não é gravado.

const MODELO_PADRAO = "gemini-flash-lite-latest";
const RESERVAS = ["gemini-flash-latest"];
const API = "https://generativelanguage.googleapis.com/v1beta";
const ORIGENS_PADRAO = "https://v-tx-researcher.github.io,http://localhost:8765,http://127.0.0.1:8765";
const MAX_PERGUNTA = 600;
const MAX_TRECHOS = 8;
const MAX_TRECHO = 1800;

const INSTRUCOES = `Você é o chat da PraxIA, ferramenta independente de consulta a documentos oficiais do Serviço Social (CFESS, CRESS e ABEPSS).
Regras obrigatórias:
1. Use SOMENTE os trechos fornecidos. Não use conhecimento próprio nem invente normas, artigos ou documentos.
2. Seu papel é INDICAR o material oficial que corresponde à dúvida: diga qual documento e qual dispositivo tratam do assunto e por quê, citando o identificador do trecho entre colchetes, por exemplo [E1] ou [O2].
3. Não emita parecer, não decida o caso e não diga o que a pessoa deve fazer. Se os trechos não tratam da dúvida, diga isso claramente e sugira procurar o CRESS da sua região.
4. Separe o que é norma (resoluções, Código de Ética, leis) do que é orientação (cartilhas, notas técnicas, pareceres), que não é norma.
5. Se a pergunta contiver dados pessoais ou de pessoas atendidas, não os repita.
6. Escreva em português do Brasil, linguagem simples, no máximo 200 palavras.
7. Termine SEMPRE com esta frase, exatamente: "Esta resposta não substitui, de nenhuma maneira, as respostas diretas do CFESS, dos CRESS e das demais instituições representativas da categoria."`;

function cabecalhos(origem) {
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}
const resposta = (corpo, status, origem) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem) });

export default {
  async fetch(req, env) {
    const permitidas = (env.ORIGENS || ORIGENS_PADRAO).split(",").map((s) => s.trim());
    const origem = req.headers.get("Origin") || "";
    if (!permitidas.includes(origem)) return new Response("Origem não autorizada.", { status: 403 });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecalhos(origem) });
    if (!env.GEMINI_API_KEY) return resposta({ erro: "Chave não configurada no intermediário." }, 500, origem);
    if (req.method === "GET" && new URL(req.url).searchParams.get("modelos")) return resposta({ modelos: await listarModelos(env) }, 200, origem);
    if (req.method !== "POST") return resposta({ erro: "Use POST." }, 405, origem);

    let dados;
    try { dados = await req.json(); } catch { return resposta({ erro: "Pedido inválido." }, 400, origem); }
    const pergunta = String(dados?.pergunta || "").trim().slice(0, MAX_PERGUNTA);
    const trechos = Array.isArray(dados?.trechos) ? dados.trechos.slice(0, MAX_TRECHOS) : [];
    if (pergunta.length < 8 || !trechos.length) return resposta({ erro: "Faltam a pergunta ou os trechos." }, 400, origem);

    const texto = trechos.map((t) => [
      `[${String(t.id || "").slice(0, 6)}] ${String(t.categoria || "").slice(0, 60)} — ${String(t.documento || "").slice(0, 200)}`,
      `Local: ${String(t.local || "").slice(0, 120)}`,
      String(t.texto || "").slice(0, MAX_TRECHO),
    ].join("\n")).join("\n\n");

    const cota = await reservarCota(req, env);
    if (!cota.ok) return resposta({ erro: cota.erro, limite: true }, 429, origem);

    // Tenta o modelo escolhido e, se estiver indisponível no nível gratuito, os de reserva.
    const modelos = [...new Set([env.MODELO || MODELO_PADRAO, ...RESERVAS])];
    const corpo = JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCOES }] },
      contents: [{ role: "user", parts: [{ text: `Pergunta: ${pergunta}\n\nTrechos oficiais:\n\n${texto}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    });
    const falhas = [];
    let limite = false;
    for (const modelo of modelos) {
      let r;
      try {
        r = await fetch(`${API}/models/${encodeURIComponent(modelo)}:generateContent`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: corpo,
        });
      } catch { falhas.push(`${modelo}: sem conexão`); continue; }
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const saida = (j?.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
        if (saida) return resposta({ texto: saida, modelo }, 200, origem);
        falhas.push(`${modelo}: sem texto`); continue;
      }
      if (r.status === 429) limite = true;
      falhas.push(`${modelo}: ${r.status} ${String(j?.error?.message || "").slice(0, 160)}`);
    }
    if (limite) return resposta({ erro: "Limite gratuito atingido. A busca local continua funcionando.", detalhes: falhas }, 429, origem);
    return resposta({ erro: "O Gemini não respondeu agora. A busca local continua funcionando.", detalhes: falhas }, 502, origem);
  },
};

// ---- limites de uso (gratuidade) ----
const memoria = new Map(); // reserva sem KV: vale só dentro de uma instância (aproximado)
async function reservarCota(req, env) {
  const tetoDia = Number(env.TETO_DIA) || 400;
  const tetoPessoa = Number(env.TETO_PESSOA) || 15;
  const dia = new Date().toISOString().slice(0, 10);
  const ip = req.headers.get("CF-Connecting-IP") || "sem-ip";
  const bruto = new TextEncoder().encode(`${ip}|${dia}|${env.GEMINI_API_KEY.slice(-6)}`);
  const pessoa = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bruto))].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  const kGeral = `g:${dia}`, kPessoa = `p:${dia}:${pessoa}`;
  const msgPessoa = `Você chegou ao limite de ${tetoPessoa} explicações por dia. Amanhã libera de novo; a busca local continua funcionando.`;
  const msgGeral = "O limite gratuito de hoje da PraxIA foi atingido. Amanhã libera de novo; a busca local continua funcionando.";
  if (!env.LIMITES) {
    const g = (memoria.get(kGeral) || 0) + 1, p = (memoria.get(kPessoa) || 0) + 1;
    if (p > tetoPessoa) return { ok: false, erro: msgPessoa };
    if (g > tetoDia) return { ok: false, erro: msgGeral };
    memoria.set(kGeral, g); memoria.set(kPessoa, p);
    return { ok: true };
  }
  try {
    const [g, p] = await Promise.all([env.LIMITES.get(kGeral), env.LIMITES.get(kPessoa)]).then((v) => v.map((x) => Number(x) || 0));
    if (p >= tetoPessoa) return { ok: false, erro: msgPessoa };
    if (g >= tetoDia) return { ok: false, erro: msgGeral };
    const opc = { expirationTtl: 60 * 60 * 48 };
    await Promise.all([env.LIMITES.put(kGeral, String(g + 1), opc), env.LIMITES.put(kPessoa, String(p + 1), opc)]);
    return { ok: true };
  } catch {
    return { ok: false, erro: "O contador de uso gratuito não respondeu; por segurança, o chat está pausado. A busca local continua funcionando." };
  }
}

// Diagnóstico: GET ?modelos=1 (de um site autorizado) lista os modelos que a chave pode usar.
async function listarModelos(env) {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
  const j = await r.json().catch(() => ({}));
  return (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace("models/", ""));
}

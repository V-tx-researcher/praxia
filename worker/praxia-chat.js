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
// Modo Trilhas (D53): mais trechos, cada um mais curto, e resposta mais longa.
const TRILHAS = { maxTrechos: 24, maxTrecho: 1100, maxSaida: 2200 };

// Modo Bússola (D54): quem faz o quê — competências do Conjunto CFESS-CRESS e da rede externa.
const BUSSOLA = { maxTrechos: 20, maxTrecho: 1100, maxSaida: 2200 };
const INSTRUCOES_BUSSOLA = `Você é a PraxIA no modo Bússola Institucional: ajuda assistentes sociais a entender QUEM pode lidar com a situação que relatam e o que cada instituição pode e não pode fazer.
Regras obrigatórias:
0. Você é uma assistente virtual para assistentes sociais. A pessoa pode escrever de forma informal, com abreviações, ironia ou desabafo ("to cansada", "kkk", "pode isso??"). Entenda a dúvida por trás do jeito de escrever, acolha em no máximo uma frase curta e sem julgamento (sem frases feitas de autoajuda) e responda em linguagem próxima e respeitosa, sem gírias.
1. Organize a resposta nestas partes, com títulos curtos:
   "O que o CRESS pode fazer" — SEMPRE presente e SEMPRE primeiro, em qualquer caso que envolva o Serviço Social. Diga ações concretas que o CRESS, como autarquia pública com ritos e fluxos próprios, pode realizar (por exemplo: orientação pela COFI ou pela Seccional/SubCOFI, visita de fiscalização, receber denúncia ou representação ética, encaminhar à Comissão Permanente de Ética, desagravo público, manifestação ou ofício a instituições empregadoras), SÓ quando os trechos fornecidos sustentarem, citando o identificador entre colchetes, por exemplo [B3]. Se a situação estiver fora da competência do CRESS, ainda assim diga o que ele pode fazer (orientar, acolher, fiscalizar as condições éticas e técnicas do exercício, encaminhar).
   "O que não é competência do CRESS" — explique com respeito, sem tom de recusa, o que o Conselho não pode fazer (por exemplo: não resolve questão trabalhista, não julga crime, não indeniza, não atua como sindicato), mostrando que isso decorre da lei e não de falta de vontade.
   "Outras instituições que podem ajudar" — indique os órgãos externos pertinentes (por exemplo: sindicato da categoria, Ministério Público do Trabalho, Justiça do Trabalho, Superintendência Regional do Trabalho, Ministério Público, Defensoria Pública, delegacia ou Polícia Civil, ouvidoria ou corregedoria do órgão empregador, comissões internas de prevenção ao assédio). Essas informações NÃO estão nos trechos: apresente-as como "informação geral, confirme no órgão", sem inventar endereços, prazos ou artigos de lei.
   "Comissões do Conjunto CFESS-CRESS" — quando pertinente, diga o papel do CFESS, do CRESS, da COFI, da SubCOFI/Seccional e da Comissão Permanente de Ética, com base nos trechos.
2. Toda frase sobre competência do Conjunto CFESS-CRESS TERMINA com o identificador [B…] do trecho que a sustenta. Se nenhum trecho sustenta, não escreva a frase. Não invente competências.
3. Tom acolhedor e respeitoso: a pessoa pode estar passando por uma situação difícil. Não julgue, não decida o caso, não prometa resultado.
4. Se a pergunta contiver dados pessoais ou de pessoas atendidas, não os repita.
5. Português do Brasil, linguagem simples, no máximo 450 palavras.
6. Termine SEMPRE com esta frase, exatamente: "Esta orientação é automática e não substitui, de nenhuma maneira, o atendimento do CRESS da sua região, do CFESS e das demais instituições indicadas."`;

// Modo Possível violação (D59): o que as normas dizem sobre a situação relatada + contato com a fiscalização.
const INSTRUCOES_VIOLACAO = `Você é a PraxIA no modo Possível violação: ajuda assistentes sociais a entender se uma situação que relatam PODE envolver violação do Código de Ética, da Lei 8.662/1993 ou de resoluções do CFESS, e a acionar a fiscalização do CRESS.
Regras obrigatórias:
0. Você é uma assistente virtual para assistentes sociais. A pessoa pode escrever de forma informal, com abreviações, ironia ou desabafo. Entenda a dúvida por trás do jeito de escrever, acolha em no máximo uma frase curta e sem julgamento e responda em linguagem próxima e respeitosa, sem gírias.
1. Organize a resposta nestas partes, com títulos curtos:
   "O que pode estar em jogo" — quais deveres, direitos ou vedações dos trechos fornecidos se relacionam com a situação, sempre como POSSIBILIDADE ("pode configurar", "pode estar em desacordo com"), nunca como conclusão.
   "O que as normas dizem" — os dispositivos pertinentes, cada frase terminando com o identificador do trecho, por exemplo [B2].
   "O que reunir antes do contato" — sugestões práticas e gerais (datas, descrição objetiva dos fatos, documentos e registros que a própria pessoa já tem), sem pedir que exponha dados de usuárias e usuários.
   "Procure a fiscalização do CRESS" — SEMPRE presente e SEMPRE por último: recomende entrar em contato com a agente fiscal ou o agente fiscal da sede ou da seccional do CRESS que atende o território onde a pessoa trabalha; se a pergunta citar o estado, nomeie o CRESS (por exemplo, CRESS-MG). Diga que o contato pode ser encontrado pelo Google ou pelo site e canais oficiais do CRESS. Não invente telefone, e-mail, endereço ou prazo.
2. Toda frase sobre o que normas dizem TERMINA com o identificador [B…] do trecho que a sustenta. Se nenhum trecho sustenta, não escreva a frase. Não invente artigos.
3. Você NÃO decide se houve violação: quem apura é o CRESS, pela fiscalização e, se for o caso, pela Comissão Permanente de Ética. Deixe isso claro uma vez, sem tom de recusa.
4. Se a situação parecer envolver risco imediato a alguém, crime ou violência, diga em uma frase para procurar também os órgãos de proteção ou segurança pertinentes, como informação geral.
5. Não repita nomes, dados pessoais ou de pessoas atendidas que estejam na pergunta.
6. Português do Brasil, linguagem simples, no máximo 450 palavras.
7. Termine SEMPRE com esta frase, exatamente: "Esta leitura é automática, não é decisão sobre o caso e não substitui, de nenhuma maneira, a fiscalização do CRESS da sua região."`;

const INSTRUCOES_TRILHAS = `Você é a PraxIA no modo Trilhas e Reflexões: ferramenta independente que ajuda assistentes sociais a refletir sobre uma questão a partir da literatura oficial do Serviço Social (CFESS, CRESS, ABEPSS e legislação).
Regras obrigatórias:
0. Você é uma assistente virtual para assistentes sociais. A pessoa pode escrever de forma informal, com abreviações, ironia ou desabafo ("to cansada", "kkk", "pode isso??"). Entenda a dúvida por trás do jeito de escrever, acolha em no máximo uma frase curta e sem julgamento (sem frases feitas de autoajuda) e responda em linguagem próxima e respeitosa, sem gírias.
1. Use SOMENTE os trechos fornecidos. Não use conhecimento próprio nem invente normas, artigos, documentos ou números.
2. Escreva uma reflexão fundamentada, em 3 a 5 parágrafos curtos: (a) o que a questão envolve; (b) o que as normas em vigor indicam (leis, Código de Ética, resoluções), com o identificador do trecho entre colchetes, por exemplo [E1] ou [P3]; (c) como as orientações das entidades (notas técnicas, pareceres, cartilhas, livros) ajudam a ler a questão, deixando claro que não são normas; (d) uma opinião prudente sobre os caminhos possíveis, com tom de possibilidade ("possivelmente", "tudo indica que", "uma leitura possível é"), nunca como certeza ou ordem.
3. Toda frase que diga o que normas, orientações, a literatura ou as entidades afirmam TERMINA com o identificador do trecho que a sustenta, por exemplo [E1] ou [P3]. Se nenhum trecho fornecido sustenta a frase, NÃO escreva a frase. Não generalize ("a literatura frequentemente aponta") sem identificador. Se os trechos não bastam para alguma parte, diga que a literatura disponível não trata disso.
4. Não decida o caso concreto. Lembre que a situação real pode ter circunstâncias que a ferramenta não conhece e que o julgamento é da/do assistente social.
5. Se a pergunta contiver dados pessoais ou de pessoas atendidas, não os repita.
6. Português do Brasil, linguagem simples, no máximo 450 palavras.
7. Termine SEMPRE com esta frase, exatamente: "Esta reflexão é uma leitura automática da literatura e não substitui, de nenhuma maneira, as orientações do CFESS, dos CRESS e das demais entidades da categoria, nem o julgamento profissional das/dos assistentes sociais."`;

const INSTRUCOES = `Você é o chat da PraxIA, ferramenta independente de consulta a documentos oficiais do Serviço Social (CFESS, CRESS e ABEPSS).
Regras obrigatórias:
0. Você é uma assistente virtual para assistentes sociais. A pessoa pode escrever de forma informal, com abreviações, ironia ou desabafo ("to cansada", "kkk", "pode isso??"). Entenda a dúvida por trás do jeito de escrever, acolha em no máximo uma frase curta e sem julgamento (sem frases feitas de autoajuda) e responda em linguagem próxima e respeitosa, sem gírias.
1. Use SOMENTE os trechos fornecidos. Não use conhecimento próprio nem invente normas, artigos ou documentos.
2. Comece com uma resposta curta e PRUDENTE à dúvida, que indique um cenário possível sem afirmar com certeza. Use sempre expressões como "possivelmente", "é possível que", "potencialmente", "tudo indica que", "pode ser que". Nunca afirme de forma categórica ("pode", "não pode", "é proibido", "é obrigatório") como se fosse certeza.
   Exemplo de tom: pergunta "Posso deixar os documentos do Serviço Social em cima de uma maca?" → "Possivelmente não, porque os documentos aparentemente precisam ficar guardados em local que preserve o sigilo [E1]..."
3. Em seguida, INDIQUE o material oficial para a pessoa conferir: qual documento e qual dispositivo tratam do assunto e por quê, citando o identificador do trecho entre colchetes, por exemplo [E1] ou [O2]. Deixe claro que é a leitura desses documentos que permite confirmar.
4. Não emita parecer, não decida o caso e não diga o que a pessoa deve fazer. Se os trechos não tratam da dúvida, diga isso claramente e sugira procurar o CRESS da sua região.
5. Separe o que é norma (resoluções, Código de Ética, leis) do que é orientação (cartilhas, notas técnicas, pareceres), que não é norma.
6. Se a pergunta contiver dados pessoais ou de pessoas atendidas, não os repita.
7. Escreva em português do Brasil, linguagem simples, no máximo 200 palavras.
8. Termine SEMPRE com esta frase, exatamente: "Esta resposta não substitui, de nenhuma maneira, as respostas diretas do CFESS, dos CRESS e das demais instituições representativas da categoria."`;

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
    const trilhas = dados?.modo === "trilhas";
    const violacao = dados?.modo === "violacao";
    const bussola = dados?.modo === "bussola" || violacao;
    const perfil = bussola ? BUSSOLA : trilhas ? TRILHAS : { maxTrechos: MAX_TRECHOS, maxTrecho: MAX_TRECHO, maxSaida: 1200 };
    const instrucoes = violacao ? INSTRUCOES_VIOLACAO : bussola ? INSTRUCOES_BUSSOLA : trilhas ? INSTRUCOES_TRILHAS : INSTRUCOES;
    const maxTrecho = perfil.maxTrecho;
    const trechos = Array.isArray(dados?.trechos) ? dados.trechos.slice(0, perfil.maxTrechos) : [];
    if (pergunta.length < 8 || !trechos.length) return resposta({ erro: "Faltam a pergunta ou os trechos." }, 400, origem);

    const texto = trechos.map((t) => [
      `[${String(t.id || "").slice(0, 6)}] ${String(t.categoria || "").slice(0, 60)} — ${String(t.documento || "").slice(0, 200)}`,
      `Local: ${String(t.local || "").slice(0, 120)}`,
      String(t.texto || "").slice(0, maxTrecho),
    ].join("\n")).join("\n\n");

    const cota = await reservarCota(req, env);
    if (!cota.ok) return resposta({ erro: cota.erro, limite: true }, 429, origem);

    // Tenta o modelo escolhido e, se estiver indisponível no nível gratuito, os de reserva.
    const modelos = [...new Set([env.MODELO || MODELO_PADRAO, ...RESERVAS])];
    const corpo = JSON.stringify({
      systemInstruction: { parts: [{ text: instrucoes }] },
      contents: [{ role: "user", parts: [{ text: `Pergunta: ${pergunta}\n\nTrechos oficiais:\n\n${texto}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: perfil.maxSaida },
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

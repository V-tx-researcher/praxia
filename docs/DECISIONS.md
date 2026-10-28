# Registro de decisões

Formato: data — decisão — justificativa — reversibilidade. Decisões que dependem
do responsável pelo projeto ficam em "Pendentes".

## Tomadas (técnicas, rotineiras)

**D01 — 26/10/2026 — Aproveitar o protótipo, reestruturando-o.**
O protótipo era um esqueleto de interface (3 arquivos) com acervo vazio. Foram
mantidos: a identidade visual (cores institucionais), a montagem de DOM por
`textContent` (sem `innerHTML`, evita injeção de HTML), o filtro "somente
aprovados" e a mensagem de insuficiência. Foram substituídos: a busca
(`split(/\W+/)` quebrava palavras acentuadas — "atribuições" virava "atribui" +
"es") e o caminho do índice (`../dados`, que exigia servir a raiz do projeto).
O arquivo vazio `dados/indices/documentos.json` foi removido (substituído por
`app/dados/acervo-*.json`).

**D02 — Aplicação 100% estática, sem backend.** Atende à gratuidade (hospedagem
estática gratuita) e à privacidade (a pergunta não sai do navegador). Reversível.

**D03 — Pipeline em Python, catálogo em JSON (um arquivo por documento).**
Legível, versionável no Git, revisável em pull request; dispensa banco de dados.

**D04 — Extração com pypdfium2 (licença Apache-2.0/BSD).** Boa qualidade de texto,
rápido; PyMuPDF foi descartado por ser AGPL. OCR ainda não implementado:
documentos digitalizados ficam em `erro_extracao` com alerta `requer_ocr`.

**D05 — Citações por deslocamento (página, início, fim) com autoverificação.**
É o mecanismo que garante que todo trecho exibido existe literalmente no texto
extraído do PDF oficial. A hifenização de fim de linha só é desfeita quando a
palavra unida aparece em outro ponto do mesmo documento (preserva "ético-político").

**D06 — Segmentação conservadora.** Documento único por padrão; nova parte apenas
quando a numeração de artigos recomeça (alerta para conferência). Compilações
(livreto do Código de Ética) usam mapa de partes declarado e vinculado ao SHA-256.
Motivo: a detecção por títulos fragmentava resoluções simples (considerandos que
citam outras normas viravam "partes").

**D07 — Busca lexical BM25 por dispositivo, com radicalizador Snowball-pt próprio
(algoritmo BSD), redução de plural prévia e tesauro do domínio.** Sem dependências
externas; auditável. O contexto do caput entra com peso 0,5 (as alíneas herdam o
sentido de "É vedado ao/à assistente social:"). Busca semântica fica para a
próxima etapa (D-P3).

**D08 — Suficiência mínima na recuperação.** Só há evidências quando o melhor
dispositivo cobre ≥ 40% dos termos informativos da pergunta (sinônimos valem 0,6)
ou ao menos dois deles. Reduz respostas fora do domínio; não substitui a
verificação de pertinência (ver EVALUATION.md, limitações).

**D09 — A LLM nunca redige citações; verificação automática obrigatória.**
Ver ARCHITECTURE.md, princípio 2. O limiar de correspondência (34% dos termos da
afirmação presentes nas evidências citadas) é heurístico e documentado.

**D10 — LLM desligada na configuração pública** (`app/js/config.js`) até a decisão
D-P1 e a avaliação mínima. Teste interno só em `localhost` (`?llm=MODELO`).

**D11 — WebLLM fixado na versão 0.2.85** (publicada em 08/09/2026; a 0.2.86 tinha
menos de duas semanas em 26/10/2026). Carregado do jsDelivr.

**D12 — Textos editoriais fora do índice público.** Apresentações e introduções
do livreto do CFESS não são atos oficiais e têm direitos reservados; ficam apenas
na prévia interna. PDFs não são republicados (somente link oficial).

**D13 — Sem histórico de perguntas.** Privacidade por padrão; a prioridade
"histórico local opcional" pode ser revista sem risco.

**D14 — Mapa de partes do Código de Ética proposto pelo desenvolvimento.**
`dados/configuracao/partes/cfess-codigo-etica-1993.json` foi escrito a partir da
leitura do PDF e **precisa ser confirmado** na conferência humana.

**D15 — Situação normativa nunca é alterada automaticamente.** Indicações do
portal ("Revogada integralmente pela Resolução CFESS nº 1.114/2025") viram
alertas `portal_indica_situacao:*` para a pessoa que confere.

**D16 — Cache do modelo com recurso a IndexedDB.** No teste de 26/10/2026 o Cache
Storage do navegador falhou repetidamente ao gravar um fragmento do modelo
("Failed to execute 'add' on 'Cache'"); o motor tenta IndexedDB como alternativa.

**D17 — 26/10/2026 — Decisão do responsável sobre a IA (antiga D-P1): opção A com adendo.**
Publicar primeiro o modo documental; continuar avaliando modelos maiores; a análise
por IA, quando liberada, será **ativada ou desativada pela própria pessoa usuária**,
que verá antes um diagnóstico do seu dispositivo (WebGPU, espaço disponível, tamanho
do download, memória de vídeo estimada) e poderá remover o modelo baixado.
Implementação: `app/js/llm/capacidade.js` e painel "Análise por IA no meu
dispositivo". Na configuração pública, `CONFIG.llm.permitirAtivacao = false` até
cumprir os critérios mínimos de NEXT_STEPS.md; em ambiente local o painel funciona
para teste. A preferência (ligado/desligado e modelo) fica só no navegador da pessoa.

**D18 — Tolerância de caixa na primeira letra das citações** («Manter» ↔ "manter"),
convenção editorial usual; o restante permanece estritamente literal.

**D19 — 26/10/2026 — Créditos e identificação da conferência (decisão do responsável).**
Idealização creditada a Vinícius Araújo Pereira, assistente social (README, rodapé
e página de transparência). A conferência dos documentos e a avaliação das respostas
da IA são feitas pelo idealizador, sem registro de nome pessoal: as aprovações usam
o identificador de função `revisao-profissional` (o pipeline exige um identificador
humano para impedir aprovação automática), e o índice público mostra apenas a data
da conferência. Substitui a pendência D-P2.

**D20 — 27/10/2026 — Vigência por dispositivo.** A conferência registra, quando
houver, a situação de dispositivos específicos (`revogado`, `alterado`,
`vigente_com_ressalva`), sempre com fonte oficial vinculada. Relações indicadas pelo
revisor que não puderam ser conferidas em texto oficial ficam como pendência interna
e não são exibidas ao público como fato.

**D21 — 27/10/2026 — Acervo completo (pedido do revisor).** O objetivo passa a ser
incluir todas as resoluções e documentos normativos do Conjunto CFESS-CRESS, não só
uma seleção; atos administrativos continuam fora, mediante conferência.

**D22 — 27/10/2026 — Texto tachado em versões compiladas.** O CFESS publica versões
compiladas em que a redação revogada aparece riscada; a extração de texto não
distingue o risco. A extração passa a detectar traços que cruzam a faixa central dos
caracteres (o sublinhado, na base, não conta; sequências com menos de 3 caracteres
são ignoradas) e retira esse texto do texto canônico, guardando-o em
`texto_riscado_removido` para conferência. Afetou 13 documentos (ex.: 2.668
caracteres na Res. 1.014/2022). Documentos normais não foram alterados (teste).

**D23 — 27/10/2026 — Versões compiladas como referência.** Quando o portal publica
o texto original e uma versão compilada, a compilada (com o tachado retirado) é a
referência indexada e a original fica fora do índice (`texto_incorporado:`), salvo
se a compilada for ilegível (`nao_indexar:`), como na Res. 954/2020. Páginas com
arquivo idêntico a outro (`duplicata_de:`) não são indexadas.

**D24 — 27/10/2026 — Coleta pela listagem geral.** O portal tem documentos sem
categoria (ex.: Res. 660/2013, Código Processual de Ética); a descoberta passa a
percorrer também a listagem geral (`--categorias 0 --apenas-novos`). Total no portal:
682 páginas de legislação.

**D25 — 27/10/2026 — Normas regionais filtradas pela região da pessoa usuária
(diretriz do responsável).** Quando os CRESS forem incluídos, a pessoa poderá marcar
sua região (UF) na interface; a busca usará as normas nacionais (`abrangencia =
nacional`) e as da região escolhida (`regional:UF`). A escolha fica só no navegador,
como preferência. O campo `abrangencia` já existe no esquema; falta o seletor na
interface e o filtro na busca, a implementar junto com a coleta dos CRESS.

**D26 — 27/10/2026 — Timbre institucional e reprocessamento técnico.** Linhas de
timbre (endereço, telefone, autenticação eletrônica, sublinhados) são excluídas do
texto onde aparecerem; a detecção de cabeçalho/rodapé repetido usa janela de 5 linhas
e, em documentos de até 4 páginas, repetição em 2 páginas. Melhorias de
processamento que alterem o texto de documentos publicados, sem mudança do arquivo
oficial, são aplicadas por reprocessamento técnico que mantém a conferência original
(registrada em `conferencia_original`).

**D27 — 27/10/2026 — Conferência só vale se for humana.** Respostas de atividades
geradas por ferramentas de IA não são registradas como conferência, ainda que
informativas; achados técnicos nelas apontados são verificados e aproveitados.

**D28 — 27/10/2026 — Transcrição registrada quando a extração perde texto.**
Quando o PDF oficial tem texto que a extração não entrega (fonte sem mapa de
caracteres, como na Res. 954/2020), as páginas afetadas podem ser transcritas da
imagem do próprio PDF em `dados/configuracao/transcricoes/<id>.json`, vinculadas ao
SHA-256 do arquivo. O processamento só aceita a transcrição se todo o texto extraído
aparecer nela, na mesma ordem (ela pode acrescentar, nunca trocar ou apagar); os
acréscimos ficam registrados em `transcricao_aplicada` e o documento informa ao
público que o texto foi completado por transcrição. Se o arquivo oficial mudar, a
transcrição deixa de valer e bloqueia a aprovação. Serve também de caminho para
documentos digitalizados (OCR) como a Res. 383/1999.

**D29 — 27/10/2026 — Assinatura e nota de publicação fora do último artigo.**
Linhas de assinatura ("NOME" seguido de "Presidente do CFESS") e a nota de
publicação no DOU passam a formar um trecho próprio ("assinatura e publicação"), a
pedido do revisor (Res. 950/2020). Efeito colateral positivo: na Res. 782/2016, os
blocos do formulário anexo deixaram de ser lidos como incisos do Art. 5º. Os
documentos publicados foram reprocessados (D26), mantendo a conferência original.

**D30 — 27/10/2026 — Pendências delegadas pelo revisor.** Quando o revisor delega
expressamente uma pendência, o desenvolvimento pesquisa em fonte oficial e a
aprovação registra essa origem na observação da conferência e em
`docs/revisao/REGISTRO.md`. O revisor pode revê-la a qualquer momento.

**D31 — 28/10/2026 — Marcação contrária ao texto oficial.** Quando a marcação do
revisor contradiz um texto oficial conferido (ex.: Orientação Normativa 2/2018
marcada "Vigente", mas revogada expressamente pela Res. 1.031/2023, Art. 14), vale o
texto oficial, sempre no sentido mais cauteloso (não apresentar como vigente). A
divergência fica registrada na conferência e é comunicada ao revisor, que pode revê-la.

**D32 — 28/10/2026 — Situação "suspensa ou invalidada por decisão judicial"**
(`sem_efeito_judicial`). Normas com efeitos suspensos ou invalidadas pela Justiça
(Res. 554/2009 e 559/2009) não são "revogadas" pelo CFESS; recebem situação própria,
com o mesmo tratamento de inaplicabilidade e peso de busca das revogadas e nota com a
decisão. Após a conferência, as indicações do portal deixam de aparecer como "não
conferidas" (a nota conferida as substitui).

**D33 — 28/10/2026 — Correções de segmentação apontadas nas conferências dos lotes 3 a 5.**
(1) Em normas que dão nova redação a outras, só o artigo seguinte da própria norma
encerra o texto citado; "Art. 2º (...)", "Art. 2º" sozinho na linha e o artigo logo
após "a seguinte redação:" são citação (antes, o Art. 17 citado pela Res. 828/2017
engolia os Arts. 2º a 5º, inclusive a revogação da Res. 782/2016). (2) A fórmula
partida em duas linhas e "nos seguintes termos:" / "Ficam acrescidos … ao artigo N:"
também abrem citação. (3) Linhas terminadas em ":", ";" ou "," e linhas de artigo não
são tratadas como cabeçalho repetido. (4) "Parágrafo Primeiro" com inicial maiúscula
é parágrafo. (5) "Presidenta" na assinatura. Documentos publicados reprocessados (D26).

**D34 — 28/10/2026 — Busca: normas citadas, fatos passados, termos gerais e anexos.**
(1) Norma citada pelo nome ou número na pergunta ("Res. 559/2009", "Lei 8.662/93",
"Código Processual de Ética") recebe prioridade (×1,8) e não perde peso por estar
revogada ou suspensa — quem cita quer ler a norma; o aviso de vigência continua.
(2) Pergunta sobre fatos passados ("em 2010…") não rebaixa normas hoje revogadas.
(3) Radicais presentes em quase toda pergunta do domínio ("assistente", "social",
"profissional", "CRESS"…) não contam como termos informativos (só se forem os únicos).
(4) Texto depois da assinatura (formulários, modelos) é "anexo" (peso 0,5); a
assinatura, 0,3. (5) Tesauro ampliado (gravação, substituição, pena, prazo, diploma,
metas, assinatura, instância). Avaliação (122 perguntas, gabarito não revisado):
aprovação 0,842 → 0,917; recall@8 0,779 → 0,843. Ajustes parados aqui para não
"decorar" o conjunto de avaliação.

**D35 — 28/10/2026 — Recursos para assistentes sociais, docentes e estudantes.**
Perguntas de exemplo por público (recolhidas após a primeira consulta, para não
empurrar o resultado no celular); "Como citar (ABNT)" em cada trecho e documento
(referência NBR 6023 e citação NBR 10520, com botão de copiar; a referência aponta
para a norma oficial, não para a plataforma); filtro por tema e busca na ementa na
Biblioteca; aba "Como usar" com orientação de uso e glossário em linguagem simples;
"Imprimir ou salvar em PDF" e "Copiar a resposta" (a impressão traz a pergunta já
mascarada e a data). Correções: conflito da classe `.marca` que espremia o topo da
página; lista de arquivos para uso sem internet incompleta (faltava o radicalizador),
agora protegida por teste.

**D36 — 28/10/2026 — Busca por sentido opcional (antiga D-P3), por delegação do responsável.**
Modelo `Xenova/multilingual-e5-small` (MIT, q8, ~120 MB), executado no navegador com
Transformers.js 4.3.0 (jsDelivr, publicado em 16/09/2026). Vetores dos 1.809 trechos
pré-calculados em Node (`scripts/semantica/gerar_vetores.mjs`, int8, ~1 MB) e
vinculados à versão do acervo (vetores desatualizados são ignorados). Combinação por
fusão de posições (RRF) com peso 0,4 para o sentido: na avaliação, 0,907 → 0,915
(peso 1 piorou para 0,890), e ajudou perguntas em linguagem do dia a dia (ex.: "terapia
de casal" passa a trazer a Res. 569/2010 primeiro). A suficiência continua sendo decidida
só pela busca por termos: o sentido reordena e acrescenta, mas não cria resposta onde não
há termos da pergunta. **Desligada por padrão**; a pessoa ativa no painel "Busca por
sentido", com aviso do download; pode remover o modelo. Falha no carregamento não
interrompe a consulta (segue só por termos — testado).

**D37 — 28/10/2026 — Tema escuro, app instalável e robustez multiplataforma (pedido do responsável).**
Tema escuro elegante como padrão (grafite azulado e dourado), claro opcional e sem
"piscar" (`js/tema.js`); impressão sempre clara. PWA completo: ícones PNG (192, 512,
maskable, apple-touch), manifesto com atalhos, service worker em rede-primeiro com
limite de 4 s e reserva local (uma estratégia só, para não misturar versões de página e
código), aviso "Atualizar agora". Robustez: três tentativas ao carregar o acervo, aviso
sem conexão, cópia com alternativa fora de https, envio compatível com Safari antigo,
alvos de toque de 44 px, campos com 16 px (sem zoom no iOS), áreas seguras. Removido
um lookbehind de expressão regular que impedia o app de abrir em iOS < 16.4 (teste
impede o retorno). CSP: `script-src` passa a aceitar `blob:` — o motor ONNX da busca
por sentido cria o seu módulo de cálculo assim; só a própria página cria esses
scripts. Teste visual automatizado em Chrome e Edge (`scripts/capturas.mjs`):
celular, tablet e computador, temas escuro e claro, sem erros de console e sem
rolagem lateral.

**D38 — 28/10/2026 — Modelo de IA local escolhido e ajustes de verificação.**
Diretriz do responsável: seguir gratuito (IA no aparelho). Testados Qwen3 8B, Qwen3.5
9B e Qwen2.5 7B em Chrome real com WebGPU (EVALUATION.md, 3b); escolhido Qwen3 8B
(melhor equilíbrio entre pertinência, descarte e tempo). Instruções v2: resposta direta
primeiro, corrigir premissa errada, sinalizar norma revogada/suspensa e não dizer mais
do que as evidências. Verificação: citação que junta caput e alínea/inciso passa a ser
aceita quando cada parte é literal (antes, a frase central de perguntas sobre vedações
era descartada). A IA continua **bloqueada na versão pública** (`permitirAtivacao:
false`) até a Atividade nº 10 (avaliação humana das respostas).

**D39 — 28/10/2026 — Prioridade das referências (sugestão do responsável).** Cada
trecho recebe um nível — "mais diretamente relacionada à pergunta" (a mais bem
posicionada e as que cobrem quase tantos termos quanto ela, até 3), "também
relacionada" e "complementar (contexto)" — e a fundamentação abre com a "ordem de
leitura sugerida". Normas fora de vigor e anexos (formulários) ficam como
complementares quando há alternativa vigente. A prioridade é aviso de leitura, não
juízo sobre o caso (texto na tela). Não altera as respostas da IA.

**D40 — 28/10/2026 — Literatura acadêmica fica fora do app (revista no mesmo dia).**
Primeiro a literatura de acesso aberto (8 blocos levantados com
`docs/revisao/PROMPT_ChatGPT_literatura_critica.md`; 119 linhas, 109 textos únicos,
links conferidos por `scripts/literatura/conferir_links.py`) entrou como seção de
"leituras críticas". Por decisão do responsável, **o app não recomenda artigos, teses
ou livros de autores**: só textos oficiais do CFESS, dos CRESS e da ABEPSS, usados para
deixar a análise mais robusta (D41). As planilhas ficam no repositório como material
de pesquisa (`docs/revisao/literatura_bloco_N.csv`; consolidação interna em
`dados/literatura/`), e os documentos oficiais que elas apontavam passaram à camada 2.

**D41 — 28/10/2026 — Camada 2: orientações institucionais do CFESS, dos CRESS e da ABEPSS.**
28 publicações oficiais e gratuitas (cartilhas, notas técnicas, pareceres jurídicos,
parâmetros de atuação, Política Nacional de Estágio e Diretrizes Curriculares da ABEPSS,
cadernos "Assistente social no combate ao preconceito"), listadas em
`dados/configuracao/camada2.json` e processadas por `pipeline/gpecss/interpretacao.py`
(`python -m gpecss camada2 baixar|processar|indexar`). Trechos de até ~1.400 caracteres
dentro de cada página, sem cabeçalhos, rodapés, formulários e elementos de navegação,
cortados em cada novo parecer ou título, com a mesma autoverificação literal das normas.
Índice **separado** (`app/dados/interpretacao-{previa,publico}.json`): as orientações
nunca entram na fundamentação normativa. Na resposta: seção "Como as entidades da
profissão orientam", com até 3 trechos (um por publicação, cobertura mínima de 0,6 dos
termos da pergunta, só quando já há base normativa, sem trechos que apenas transcrevem
artigos). Na IA: identificadores O1, O2…, marcados "orientação institucional (não é
norma)"; regra 12 das instruções (dizer a fonte, nunca como regra; a norma prevalece) e,
na verificação, frase apoiada só em orientação recebe a natureza "Segundo orientação
institucional" (não pode ser "o que a norma estabelece"). Na biblioteca: lista própria,
com leitura dos trechos. O índice público só inclui documentos conferidos (Atividade nº
10, parte A, D27); a prévia não é publicada. Os documentos não declaram licença no
texto: a publicação do texto integral no arquivo do site depende da resposta do
revisor na parte A. Arquivo de ~5,5 MB: carregado depois do acervo, fora da instalação
offline (guardado no primeiro uso).

**D42 — 28/10/2026 — Atividade nº 10 registrada; IA liberada e camada 2 publicada.**
A pedido do revisor, a atividade foi pré-preenchida por IA (`docs/revisao/atividade10_sugestoes_claude.json`)
e ele a revisou e aprovou no chat ("Revisei e pode seguir"). Parte A: 38 dos 39 documentos aprovados
(fora o roteiro do CRESS-SP de 2014: direitos reservados e base processual antiga); texto integral no
índice público autorizado. Parte B (Qwen3 8B, 47 frases): 32 corretas, 11 parciais, 4 incorretas
(Q023, Q039, Q066); decisão "Sim, só depois de corrigir". Correções aplicadas antes de liberar:
avisos de norma revogada nas orientações, regras 12–14 das instruções (usar orientação que trata da
situação; citar direito e dever; não usar dispositivo fora da situação nem confundir competência com
atribuição privativa). `permitirAtivacao: true` (a IA continua opcional, ativada pela própria pessoa).
Ajustes seguintes vêm do uso, apontados pelo responsável.

## Pendentes (dependem do responsável)

**D-P4 — Publicação** (Cloudflare Pages × GitHub Pages), criação de contas e
integração com o site Wix (link simples × incorporação por iframe).

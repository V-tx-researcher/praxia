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

## Pendentes (dependem do responsável)

**D-P1 — Modelo de IA local e estratégia para dispositivos sem WebGPU.**
Apresentada na resposta de 26/10/2026 (ver PROGRESS.md, "Bloqueado").

**D-P2 — Responsáveis pela conferência humana** (nomes/identificadores e critério
mínimo de formação), necessários para aprovar e publicar o primeiro documento.

**D-P3 — Busca semântica:** modelo de embeddings (ex.: multilingual-e5-small,
~120 MB no navegador) × manter apenas busca lexical em celulares.

**D-P4 — Publicação** (Cloudflare Pages × GitHub Pages), criação de contas e
integração com o site Wix (link simples × incorporação por iframe).

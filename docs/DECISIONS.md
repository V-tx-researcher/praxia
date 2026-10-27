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

## Pendentes (dependem do responsável)

**D-P3 — Busca semântica:** modelo de embeddings (ex.: multilingual-e5-small,
~120 MB no navegador) × manter apenas busca lexical em celulares.

**D-P4 — Publicação** (Cloudflare Pages × GitHub Pages), criação de contas e
integração com o site Wix (link simples × incorporação por iframe).

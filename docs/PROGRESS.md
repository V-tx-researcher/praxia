# Progresso

Atualizado em 26/10/2026 (marco 1: primeira base confiável).

## Concluído e testado com sucesso
- **Leituras críticas (28/10/2026, D40):** 108 textos de acesso aberto ligados a 28 normas do acervo, com referência ABNT, posição sobre a norma e link conferido; sugestões ao fim de cada resposta, leituras por norma na biblioteca e seção com filtros. Conferido no navegador (computador e celular, 5 perguntas de temas diferentes). 42 testes JS passando.
- **IA local avaliada (28/10/2026):** Qwen3 8B, Qwen3.5 9B e Qwen2.5 7B rodados no Chrome com a placa de vídeo; escolhido Qwen3 8B com instruções v2 (pertinência 16/19, 12% de frases descartadas, 29 s); verificação aceita caput + alínea. Atividade nº 10 (avaliação humana das respostas) enviada; IA segue bloqueada no público até aprovação (D38).
- **Tema escuro, app instalável e busca por sentido (28/10/2026):** tema escuro elegante (claro opcional), PWA com ícones, uso offline e aviso de atualização, robustez de rede e compatibilidade (iOS antigo), alvos de toque e áreas seguras (D37); busca por sentido opcional com multilingual-e5-small no navegador, fundida à busca por termos (D36). Teste visual automatizado em Chrome e Edge (celular, tablet, computador; dois temas) sem erros. 33 testes JS passando.
- **Busca e usabilidade (28/10/2026):** prioridade para normas citadas, termos gerais fora da suficiência, anexos com peso menor (D34) — avaliação 0,917 (recall@8 0,843); exemplos por público, "Como citar (ABNT)", filtro por tema, aba "Como usar" com glossário, imprimir/copiar resposta, correção do topo e do uso sem internet (D35). 30 testes JS e 36 Python passando; conferido na tela (computador e celular).
- **Acervo nacional conferido (28/10/2026):** Atividades nº 5 a 8 registradas; 59 documentos publicados (1.809 unidades). Nova situação "suspensa ou invalidada por decisão judicial" (D32); correções de segmentação de normas que alteram outras e de parágrafos por extenso (D33). Avaliação da busca: aprovação 0,842, recall@8 0,779 (antes 0,858 e 0,792).
- **Lotes 3 a 6 enviados (27/10/2026):** Atividades nº 5 a 8 com as 39 normas restantes (inscrição e registro; processo ético; fiscalização, orientações normativas e outros; históricas), com relações conhecidas extraídas das ementas do portal. Prompt de pesquisa para apoio por IA em `docs/revisao/PROMPT_ChatGPT_pesquisa.md`. Res. 383/1999 (imagem) transcrita (D28), a conferir na Atividade nº 7.
- **Lote 2 conferido (27/10/2026):** 11 normas do lote 2 e a Res. 954/2020 publicadas; acervo público com 20 documentos e 897 unidades. Pendências delegadas pelo revisor resolvidas por pesquisa (952/2020: vigência; 954/2020: transcrição registrada com verificação automática — D28, D30). Assinatura separada do último artigo (D29). Avaliação da busca na prévia: aprovação 0,858, recall@8 0,792 (antes 0,867 e 0,801, com acervo menor).
- **Lote 1 conferido (27/10/2026):** Res. 1.114/2025, 1.098/2025, 533/2008, 557/2009, 512/2007, 970/2021 e 594/2011 publicadas; acervo público com 8 documentos e 472 dispositivos. Res. 954/2020 aguarda texto do Art. 1º.
- **Primeiro documento conferido e publicado (27/10/2026):** Código de Ética (10ª ed.), situação "vigente com alterações"; Art. 22 c com ressalva (Res. 970/2021) e Art. 25 p.ú. revogado. Acervo público: 1 documento, 225 dispositivos. Ver docs/revisao/REGISTRO.md.
- Auditoria do protótipo (ver DECISIONS.md, D01).
- Esquema de metadados com vocabulários controlados e máquina de estados com aprovação exclusivamente humana.
- Coletor do portal do CFESS: 640 registros descobertos (categorias 3, 9, 4, 1), sem erros; respeito a robots.txt e limite de taxa.
- Alertas automáticos: 31 documentos com indicação de revogação/invalidação/suspensão no portal; 161 possíveis atos administrativos.
- Download com SHA-256, detecção de tipo, duplicatas e alterações de arquivo: 17 documentos.
- Extração por página e segmentação em dispositivos: 17 documentos, todos com qualidade "boa".
- Autoverificação literal de todas as unidades e reextração independente do PDF do Código de Ética.
- Fila de conferência (CLI `fila`, `mostrar`, `aprovar`, `rejeitar`, `publicar`).
- Índices público (vazio — nada conferido) e de prévia (17 documentos, 581 unidades).
- Interface: consulta, biblioteca com filtros, leitura de dispositivos, transparência, aviso de prévia, links para o PDF na página.
- Busca lexical com Snowball-pt, tesauro e suficiência mínima.
- Verificação de respostas da LLM (citação literal, evidência obrigatória, correspondência, julgamento, norma revogada).
- Integração WebLLM testada de ponta a ponta com Qwen3-4B (18 perguntas).
- Painel "Análise por IA no meu dispositivo" (D17): diagnóstico do aparelho, ativar/desativar, troca de modelo e remoção dos arquivos baixados — testado no navegador (ativação a partir do cache, consulta com 3 afirmações aceitas, desativação, remoção).

## Testado com falhas
- Qwen3.5-4B: não carrega no navegador integrado (fragmento de 303 MiB acima do limite de armazenamento).
- Qwen3-4B: fidelidade literal garantida pela verificação, mas pertinência insuficiente (Q023, Q112, Q010) — ver EVALUATION.md.
- Insuficiência fora do domínio: 3/5 perguntas reconhecidas.

## Em andamento
- Avaliação de modelos maiores (requer navegador com limite de armazenamento maior).

## Pendente
- Conferência humana dos demais 17 documentos processados (inclui a Res. 970/2021) — pelo revisor (D19), identificador `revisao-profissional`.
- Triagem do acervo aprovada (Atividade nº 2): 58 normas incluídas; 56 processadas na prévia (1.460 unidades). Conferência em lotes: Atividade nº 3 (lote 1, 8 resoluções) enviada.
- Res. 383/1999 (assistente social como profissional da saúde): requer OCR. Res. 954/2020 compilada: ilegível na extração (requer OCR); usa-se a original.
- Listagem geral do portal: 50 documentos sem categoria; incluídos Res. 660/2013 (Código Processual de Ética), 884/2018 e as versões compiladas de 657/2013 e 418/2001 (D24).
- Texto tachado retirado de 13 documentos compilados (D22). Prévia: 58 documentos, 1.574 unidades; 62 na fila de conferência.
- Recuperação com o acervo ampliado: recall@8 caiu de 0,858 para 0,809 (mais concorrência entre trechos); reforça a prioridade da busca semântica.
- Mapa de partes do Código de Ética: confirmar (D14).
- Busca semântica; OCR; coleta dos CRESS; demais resoluções pertinentes.
- Revisão profissional do gabarito das 122 perguntas e das respostas da LLM.
- Publicação (Cloudflare Pages ou GitHub Pages) e ligação com o site Wix.

## Bloqueado (aguarda decisão ou recurso)
- D-P4: contas e publicação (exigem autorização).

## Não testado
- Painel de IA: download completo a partir do zero e comportamento em aparelhos sem placa de vídeo dedicada.
- Leitor de tela, celulares reais, PWA instalado, navegadores Firefox/Safari.

# Progresso

Atualizado em 26/10/2026 (marco 1: primeira base confiável).

## Concluído e testado com sucesso
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

## Testado com falhas
- Qwen3.5-4B: não carrega no navegador integrado (fragmento de 303 MiB acima do limite de armazenamento).
- Qwen3-4B: fidelidade literal garantida pela verificação, mas pertinência insuficiente (Q023, Q112, Q010) — ver EVALUATION.md.
- Insuficiência fora do domínio: 3/5 perguntas reconhecidas.

## Em andamento
- Avaliação de modelos maiores (requer navegador com limite de armazenamento maior).

## Pendente
- Conferência humana dos 17 documentos processados (nenhum aprovado).
- Mapa de partes do Código de Ética: confirmar (D14).
- Fundamentar o texto sobre COFI/SubCOFI na Res. CFESS 512/2007 após conferência.
- Busca semântica; OCR; coleta dos CRESS; demais resoluções pertinentes.
- Revisão profissional do gabarito das 122 perguntas e das respostas da LLM.
- Publicação (Cloudflare Pages ou GitHub Pages) e ligação com o site Wix.

## Bloqueado (aguarda decisão ou recurso)
- D-P1: estratégia para a IA local (modelo e dispositivos sem WebGPU).
- D-P2: pessoas responsáveis pela conferência (sem elas o acervo público fica vazio).
- D-P4: contas e publicação (exigem autorização).

## Não testado
- Leitor de tela, celulares reais, PWA instalado, navegadores Firefox/Safari.

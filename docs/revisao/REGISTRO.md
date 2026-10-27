# Registro das conferências

Conferências feitas pelo revisor do projeto (assistente social), registradas sem
identificação pessoal (D19). As respostas originais ficam nos arquivos `.docx` desta
pasta; o registro no catálogo é feito por scripts em `scripts/revisao/`.

## Atividade nº 4 — Lote 2 (27/10/2026) — devolvida preenchida por ferramenta de IA

**Não registrada como conferência.** O arquivo devolvido não tinha nenhuma opção
marcada; as respostas vinham prefixadas com "RESPOSTA:" e, em 6 das 11 normas, a
ferramenta declarou não ter conseguido abrir o PDF. Pela regra do projeto (aprovação
depende de revisão humana profissional), nada foi aprovado a partir dele. O arquivo
foi guardado como `Atividade_04_Lote_02_preenchida_por_IA_nao_registrada.docx` e uma
versão limpa do lote 2 foi gerada.

Achado técnico aproveitado: o timbre institucional (endereço, contato, autenticação
eletrônica) estava misturado ao texto em 41 documentos, inclusive 4 publicados.
Corrigido na segmentação; os 8 publicados foram reprocessados e republicados com a
conferência original mantida (mesmo arquivo oficial, mesmo SHA-256)
(`scripts/revisao/reprocessar_publicados.py`).

## Atividade nº 3 — Lote 1, 8 resoluções (27/10/2026)

**Resultado:** 7 aprovadas e publicadas; Res. 954/2020 com conferência parcial (não publicada).

| Norma | Situação registrada | Observações |
|---|---|---|
| Res. 1.114/2025 | vigente (confirmada) | revoga integralmente a Res. 493/2006 (Art. 21 — conferido) |
| Res. 1.098/2025 | vigente (confirmada) | revoga integralmente a Res. 556/2009 (Art. 18 — conferido) |
| Res. 533/2008 | vigente (confirmada) | — |
| Res. 557/2009 | vigente (confirmada) | as justificativas escritas no formulário referiam-se à 533/2008 (provável troca de campo); valeram as marcações |
| Res. 512/2007 | vigente com alterações | Res. 828/2017 deu nova redação aos Arts. 13, XIII, e 17 (conferido); Art. 20 revoga disposições em contrário da Res. 382/1999 (conferido); trechos riscados confirmados; anexo (PNF) separado como parte própria |
| Res. 970/2021 | vigente (confirmada) | erro material no texto oficial ("954 de 2021" nos Arts. 2º e 3º) registrado em nota |
| Res. 594/2011 | vigente (confirmada) | Art. 5º traz a assinatura da presidente (texto literal) |
| Res. 954/2020 | **não aprovada** | revisor indica "vigente com alterações" (Res. 970/2021); amostras divergentes por falha de extração; transcrições dos incisos III e IV do Art. 3º registradas; falta o Art. 1º (OCR ou transcrição) |

Uso da conferência: a orientação institucional passou a citar literalmente a
Res. 512/2007 (Art. 6º; Art. 11, VI, VII e XVI) em vez de texto genérico.

## Atividade nº 2 — Triagem do acervo (27/10/2026)

**Resultado:** o revisor aprovou a proposta e delegou ao desenvolvimento a decisão
sobre o grupo "dúvida". Incluídas 58 normas (43 + 8 históricas + 7 do grupo dúvida);
577 registros marcados `fora_do_escopo` (282 resoluções administrativas, 7 do grupo
dúvida e 288 portarias). Decisão completa em `dados/configuracao/triagem.json`.
Incluídas do grupo dúvida: Res. 418/2001, 467/2005, 560/2009, 707/2015, 950/2020,
988/2022 e 1.015/2022.

Aplicação posterior do mesmo critério (27/10/2026) aos 50 documentos sem categoria
encontrados na listagem geral do portal: incluídas Res. 660/2013, 884/2018 e as
versões compiladas de 657/2013, 418/2001 e 954/2020; 45 fora do escopo.

Achados do processamento: Res. 383/1999 é imagem (requer OCR); as páginas das
Res. 1.103/2025 e 792/2017 anexam versões compiladas de outras normas (548/2009 e
1.031/2023) — não indexadas em duplicidade; Res. 657/2013 tinha a errata como
primeiro anexo (corrigido); Res. 660/2013 existe no portal sem categoria.

## Atividade nº 1 — Código de Ética do/a Assistente Social (27/10/2026)

**Resultado:** aprovado e publicado (`situacao_normativa = alterada`).

| Questão | Resposta do revisor | Registro |
|---|---|---|
| 1. Arquivo oficial | Sim | — |
| 2. Identificação | Título, tipo e órgão conferem. Ano: não confundir a Lei 8.662/93 com o Código (Res. 273/93); o PDF é de 2012 | `ano = 1993` (norma) e `edicao = 10ª edição revista e atualizada (publicação de 2012)` |
| 3. Partes | As 8 partes conferem | mapa de partes mantido |
| 4. Amostras | 6/6 iguais ao PDF | — |
| 5a. Situação | Vigente, com alterações posteriores e particularidade no Art. 22 c | `alterada` + `nota_vigencia` |
| 5b. Dispositivos | Art. 22 c (954/2020 e 970/2021); Art. 25 p.ú. revogado; Art. 25 caput e Art. 20 a (290/1994, 333/1996); princípios e linguagem (594/2011); 293/1994 a confirmar | ver abaixo |
| 5c. Res. 954/2020, Art. 3º, I | "I - a alínea “c” do artigo 22 e o parágrafo único do artigo 25 da Resolução CFESS nº 273/1993." | `transcricoes_conferidas` na Res. 954/2020 |
| 6. Divulgação | Só link oficial e trechos | `link_e_excertos` |
| 7. Observações | Incluir todas as resoluções e documentos legais do Conjunto CFESS-CRESS | NEXT_STEPS.md, item 1 |

### Verificação das relações entre normas (pelo desenvolvimento, no texto oficial)

| Relação indicada | Fonte oficial conferida | Registrada como |
|---|---|---|
| Art. 22 c: revogação anulada, vigência restabelecida, processos suspensos | Res. 970/2021, Arts. 1º e 4º | dispositivo `vigente_com_ressalva` |
| Art. 25 p.ú.: revogado | Res. 954/2020, Art. 3º, I (transcrição do revisor) e Res. 970/2021, Art. 2º | dispositivo `revogado` |
| Princípios numerados, ortografia, orientação sexual/identidade de gênero, linguagem de gênero | Res. 594/2011, Arts. 1º a 4º | `alterado_por` (verificado) |
| Art. 25 caput (290/1994 e 333/1996); Art. 20 a (290/1994); 293/1994 | textos não localizados no portal do CFESS | `pendencias_conferencia` (não exibido ao público) |

Observação: parte do texto da questão 5 parece ter vindo de um assistente de IA
(trazia o marcador "CFESS+1"). Por isso só foram registradas as relações
confirmadas no texto oficial.

### Ajustes técnicos decorrentes desta conferência
- Situação por dispositivo (`dispositivos_afetados`): aviso exibido no próprio trecho,
  peso menor na busca para dispositivo revogado, obrigação de a IA mencionar a situação.
- Segmentação de normas que dão nova redação a outras (Res. 970/2021): artigos
  citados passam a integrar o artigo que os introduz.
- Detecção de texto perdido na extração (Res. 954/2020), impeditiva de aprovação.

# Próximos passos

Leia antes: README.md, docs/DECISIONS.md (não reabrir decisões D01–D16 sem motivo
novo) e docs/PROGRESS.md.

## Para retomar o ambiente

```bash
cd pipeline && python -m pip install -r requirements.txt
python -m gpecss validar                      # catálogo íntegro?
python -m gpecss fila --estado aguardando_conferencia
# PDFs e textos não são versionados: para reconstruir dados/brutos e dados/textos
# dos documentos já processados, rode `baixar` e `processar` para cada ID da fila.
cd .. && python -m unittest discover -s tests/python && node --test tests/js/*.test.mjs   (nucleo, capacidade, usabilidade)
node tests/avaliacao/avaliar.mjs previa
python -m http.server 8765 --bind 127.0.0.1 --directory app   # ?acervo=previa
```

Particularidades do ambiente de desenvolvimento (Windows): ao gerar arquivos por
script, prefira editar com ferramentas que preservem `\b`, `\n` e `\u` literais;
`python scripts/escapar_js.py <arquivos.js>` converte caracteres invisíveis em escapes Unicode do JavaScript.

## Verificação antes de publicar

```bash
python scripts/preparar_publicacao.py          # monta publicar/ e confere service worker e vetores
python -m http.server 8766 --directory publicar
node scripts/capturas.mjs <pasta> http://localhost:8766/            # Chrome e Edge, 3 telas, 2 temas
node scripts/capturas.mjs <pasta> http://localhost:8766/ --sentido  # ativa a busca por sentido de verdade
```

Não testado por falta do navegador nesta máquina: Firefox e Safari (iPhone/Mac). O
código evita recursos incompatíveis com Safari a partir do iOS 15 (teste
`usabilidade.test.mjs`), mas convém abrir num iPhone real após a publicação.

## Etapa seguinte (após as decisões do responsável)

00. **Conferências em lote:** concluídas (lotes 1 a 6; 59 documentos publicados). Pendências
   da Atividade nº 9 encerradas; resta só, como indício interno, o texto oficial das
   Res. 290/1994, 293/1994 e 333/1996 (Código de Ética). Próximo grande passo: busca semântica
   (D36, feita) e normas dos
   CRESS com seletor de UF (D25). Histórico do item: Atividades nº 5 a 8 (lotes 3 a 6)
   enviadas ao revisor (`scripts/revisao/preparar_lotes_restantes.py` e
   `atividade_lote.js`, com NODE_PATH apontando para um `node_modules` com `docx`).
   Ao voltarem: registrar como em `registrar_atividade4.py`; só valem as marcações ☒
   do revisor (D27). Normas do lote 6 entram como `historica`/`revogada`, com aviso.
   Fora dos lotes, por não precisarem de conferência própria: originais cujo texto
   está numa compilada (657/2013, 418/2001, 1.103/2025), a duplicata 792/2017 e a
   compilada ilegível da 954/2020. A transcrição da Res. 383/1999 (D28) não tem
   texto extraído para comparação: só aprovar se o revisor conferir os trechos.
0. **Acervo completo (D21):** baixar e processar todos os registros normativos
   descobertos (352; começar pelos sem alerta administrativo), em lotes, com
   atividades de conferência em Word agrupando vários documentos por lote
   (gerador em `scripts/revisao/atividade1.js`; registro como em
   `scripts/revisao/registrar_atividade1.py`).
1. **Conferência dos primeiros documentos** (pelo idealizador, assistente social — D19;
   registrar com `--responsavel revisao-profissional`):
   Código de Ética (confirmar mapa de partes), Res. 1.114/2025, Res. 1.098/2025,
   Res. 533/2008, Res. 557/2009, Res. 512/2007; registrar situação normativa e
   relações de revogação (493/2006 → 1.114/2025; 556/2009 → 1.098/2025;
   Código Art. 22, alínea c × Res. 954/2020). Depois: `publicar` e `indexar --modo publico`.
2. **Relações de alteração na interface:** exibir, junto ao dispositivo, as normas
   registradas em `alterado_por`/`revogado_por` (ex.: alínea c do Art. 22 do Código).
3. **Orientação institucional fundamentada:** substituir o texto genérico sobre
   COFI/SubCOFI por dispositivos da Política Nacional de Fiscalização conferida.
4. **Busca por sentido (feita, D36):** depois de cada `indexar --modo publico`, regenerar
   os vetores — `TRANSFORMERS_DIR=<pasta do pacote> node scripts/semantica/gerar_vetores.mjs publico`
   (o app ignora vetores de outra versão; o teste `usabilidade.test.mjs` avisa). Avaliar
   com `node tests/avaliacao/avaliar.mjs publico --semantica`. Ampliar o conjunto de
   avaliação com perguntas em linguagem do dia a dia (onde o ganho apareceu).
5. **Pertinência das afirmações:** avaliar verificação por modelo de inferência
   textual (NLI) leve no navegador, ou exigir que cada afirmação cite o dispositivo
   cujo texto contenha os termos centrais da pergunta.
6. **LLM (conforme D-P1):** rodar `app/dev/avaliar-llm.html` com modelos de 8–9B em
   navegador sem o limite de 256 MiB; a página agora grava as evidências enviadas
   (`evidenciasEnviadas`), permitindo reverificar com `tests/avaliacao/reverificar-llm.mjs`.
7. **Ampliar o acervo:** triagem dos 623 registros `descoberto` (começar pelos que
   não têm alerta administrativo); depois os portais dos CRESS.
8. **OCR** para documentos digitalizados (avaliar Tesseract, gratuito; custo apenas
   de processamento local).
9. **Publicação (D-P4):** `python scripts/preparar_publicacao.py` gera `publicar/`
   (sem prévia e sem páginas internas) para Cloudflare Pages; ativar a rotina
   `.github/workflows/coleta.yml` após o repositório estar no GitHub.

## Critérios mínimos antes de liberar a ativação da IA na versão pública

(`CONFIG.llm.permitirAtivacao = true` em `app/js/config.js`; ajustar também
`CONFIG.llm.modelos` para os modelos aprovados.)

- ≥ 100 perguntas com gabarito **revisado por assistente social**.
- Revisão profissional de uma amostra de respostas com 0 afirmações enganosas
  aceitas em temas de infração ética e sigilo, e taxa de afirmações incorretas
  aceitas abaixo de limite a definir com o grupo.
- Funcionamento verificado em ao menos dois navegadores de desktop.
- Acervo público com os documentos citados conferidos.

# Avaliação

Tudo o que está aqui foi efetivamente executado em 26/10/2026, salvo indicação.
Nada aqui substitui a revisão por assistentes sociais: **a aprovação das análises
ético-normativas depende de revisão profissional**.

## 1. Testes automatizados

| Conjunto | Comando | Resultado |
|---|---|---|
| Pipeline (Python) | `python -m unittest discover -s tests/python -v` | 25/25 aprovados |
| Núcleo da aplicação (JS) | `node --test tests/js/*.test.mjs` | 16/16 aprovados |

Cobrem: vocabulários controlados e máquina de estados (automação não aprova);
leitura de número/ano; alertas de situação do portal; normalização e hífen do
pdfium; detecção de OCR necessário e de instruções embutidas; segmentação
(artigos, alíneas, incisos, parágrafos, cabeçalhos repetidos, "Parágrafo único do
artigo 18" como remissão); reconstrução literal por deslocamentos e detecção de
adulteração; **reextração independente do PDF real do Código de Ética e conferência
do SHA-256**; tokenização Snowball; mascaramento de dados pessoais; classificação
A/B/C; busca; insuficiência; vigência e época dos fatos; verificação de citações
(literal, evidência inexistente, sem fonte, baixa correspondência, julgamento,
norma revogada); blindagem do prompt contra fechamento de tags; tolerância de
formato da saída do modelo.

## 2. Recuperação documental (sem LLM)

`node tests/avaliacao/avaliar.mjs publico` — 122 perguntas em
`tests/avaliacao/perguntas.json`.

| Métrica | Linha de base (17 docs, 581 unid.) | Acervo completo antes de D34 (59 docs) | Acervo completo, 28/10/2026 (59 docs, 1.809 unid.) |
|---|---|---|---|
| Perguntas avaliáveis | 120 de 122 | 120 de 122 | 120 de 122 |
| Aprovadas | 110/120 (91,7%) | 101/120 (84,2%) | 110/120 (91,7%) |
| Recall@8 das referências esperadas | 0,858 | 0,779 | 0,843 |
| MRR da primeira referência | 0,785 | 0,698 | 0,772 |
| Acurácia da classificação A/B/C | 0,844 | 0,852 | 0,852 |
| Insuficiência reconhecida (fora do domínio) | 3/5 | 3/5 | 4/5 |
| Privacidade (dados mascarados) | 2/2 | 2/2 | 2/2 |
| Injeção na pergunta | 1/1 avaliável | 1/1 | 1/1 |

Com 3,4 vezes mais documentos, a busca voltou ao nível da linha de base graças às
mudanças da D34. O gabarito ainda não foi revisado por profissional.

Resultados por pergunta: `docs/avaliacao/linha-de-base.json`.

**Limitações desta medida (importantes):**
- O gabarito foi proposto pelo desenvolvimento, que também conhecia o texto das
  normas ao escrever as perguntas — há viés otimista. Ele **não foi revisado** por
  assistente social. Algumas "falhas" são gabaritos incompletos (ex.: Q104, em que a
  Res. 533/2008 recuperada é pertinente, mas não estava no gabarito).
- Mede presença de referências entre as 8 evidências, não a pertinência de cada uma.
- Perguntas com vocabulário distante das normas ("piso salarial", "laudo de
  insalubridade") ainda recuperam trechos parcialmente relacionados.

## 3. LLM local (WebLLM) — rodada exploratória

Ambiente: navegador integrado do aplicativo Claude (Chromium 152), GPU AMD Radeon
RX 6800 XT (WebGPU com shader-f16), 32 GB de RAM. Página interna
`app/dev/avaliar-llm.html`; 18 perguntas variadas (sigilo, atribuições, condições
de trabalho, estágio, jornada, conduta de terceiros, premissas incorretas, fora do
domínio, dados pessoais, injeção).

### Compatibilidade

| Modelo | Download | Maior fragmento | Resultado neste navegador |
|---|---|---|---|
| Qwen3.5-4B (Apache-2.0) | 2,37 GB | 303 MiB | **não carregou**: o armazenamento recusa objetos > ~256 MiB (Cache Storage) e > ~200 MiB (IndexedDB) |
| Qwen3-4B (Apache-2.0) | 2,26 GB | 185 MiB | carregou em 283 s (primeiro acesso) |
| Qwen3.5-9B / Qwen3-8B / Qwen2.5-7B | 4,3–5,0 GB | 260–485 MiB | não testados aqui (mesmo limite); a testar no Chrome |

O limite de armazenamento por objeto foi medido diretamente (`caches.put` de 250 MB
aceito, 270 MB recusado; IndexedDB recusou 200 MB). Navegadores comuns podem ter
limites diferentes — **não verificado**.

### Qwen3-4B — números

| Medida | Valor |
|---|---|
| Tempo médio por pergunta | 23,4 s (prefill ~200–430 tokens/s; geração ~22 tokens/s) |
| Saídas em JSON válido | 18/18 |
| Afirmações aceitas / removidas pela verificação atual | 37 / 10 |
| Motivos de remoção | 4 citações não literais (inventadas ou alteradas); 4 apoiadas só em norma com indicação de revogação; 2 sínteses com citação/julgamento; 1 juízo de conduta |
| Perguntas sem nenhuma afirmação aceita | Q095 (juízo removido), Q107 (fora do domínio — comportamento correto) |
| Injeção "ignore todas as instruções…" (Q114) | sem efeito |

Saídas brutas: `docs/avaliacao/llm-qwen3-4b-bruto.json`; reverificação:
`…-verificado.json`; **roteiro de revisão humana**: `docs/avaliacao/llm-qwen3-4b-revisao.md`.

### Leitura preliminar (desenvolvimento, não profissional)

Problemas que **passaram** pela verificação automática:
- **Pertinência:** na Q023 (técnico administrativo assinando estudo social) o modelo
  respondeu com dispositivos sobre termos de lacração — literais, porém irrelevantes;
  na Q112 citou o plano de estágio para uma pergunta sobre entregar cópia de estudo
  social ao usuário.
- **Atribuição imprecisa:** na Q010 a afirmação sobre quando a revelação é
  admissível cita o parágrafo único do Art. 18 (extensão da revelação), e não o
  caput (hipóteses).
- **Respostas incompletas:** na Q014 listou só 2 das 13 atribuições privativas.
- Afirmações corretas e bem fundamentadas apareceram em Q005, Q033, Q063, Q066, Q102,
  Q103 e Q114.

**Conclusão provisória:** o mecanismo de fundamentação funciona (bloqueia citações
inventadas, juízos e apoio em norma revogada), mas o Qwen3-4B não atinge um nível
de pertinência aceitável para análises ético-normativas públicas. A análise por IA
permanece desligada (D10). Ver decisão pendente D-P1.

## 4. Painel de ativação pela pessoa usuária (D17)

Testado no navegador integrado em 26/10/2026: diagnóstico (WebGPU ✓, modelo já
baixado ✓, memória de vídeo e tempo de resposta marcados como "não confirmável");
ativação do Qwen3-4B a partir do cache; consulta "A chefia me deu uma ordem que fere
os princípios do Código de Ética. Devo cumprir?" com 3 afirmações aceitas e 0
removidas (Art. 8º b, Art. 4º c e Art. 21 a do Código); desativação (libera a GPU,
grava a preferência); remoção dos arquivos (o diagnóstico volta a indicar download
de 2,1 GB). Testes unitários do diagnóstico: `tests/js/capacidade.test.mjs` (6).

## 5. O que ainda não foi testado

- Revisão profissional das respostas (nenhuma).
- Modelos de 8–9B (no Chrome), desempenho em notebooks sem GPU dedicada e celulares.
- Acessibilidade com leitor de tela; navegação apenas por teclado foi implementada
  (abas com setas, foco no título da resposta), mas não auditada.
- Funcionamento como PWA instalado e em conexões lentas.
- Busca semântica (não implementada).

# Arquitetura

## Visão geral

```
 Portais oficiais (CFESS; CRESS depois)
        │  robots.txt, 1 requisição/2 s, User-Agent identificado
        ▼
 pipeline/gpecss  (Python, roda localmente ou em GitHub Actions)
   coleta.py ──► descoberto ──► baixado (SHA-256, tipo, duplicatas, alterações)
   processamento.py ──► extracao.py (texto por página, qualidade, instruções embutidas)
                    └─► estrutura.py (partes, títulos, artigos, §, incisos, alíneas
                                       com deslocamentos página/início/fim)
                    └─► citacoes.py (autoverificação literal) ──► aguardando_conferencia
   revisao.py (PESSOA) ──► aprovado ──► publicado          (rejeitado / fora_do_escopo)
   indice.py ──► app/dados/acervo-publico.json  (só publicados; sem textos editoriais)
            └─► app/dados/acervo-previa.json   (inclui não conferidos; uso interno)
        ▼
 app/  (site estático, PWA, sem servidor)
   nucleo/privacidade   mascara dados pessoais
   nucleo/classificacao situação A/B/C, temas, data dos fatos (regras auditáveis)
   nucleo/busca         BM25 por dispositivo (Snowball-pt + tesauro + contexto do caput)
   nucleo/evidencias    seleção, suficiência mínima, contexto hierárquico, link p/ página do PDF
   nucleo/vigencia      situação normativa e época dos fatos
   llm/motor + prompt   WebLLM no navegador (WebGPU), saída JSON por esquema
   nucleo/verificacao   citações literais, evidência obrigatória, pertinência, bloqueio de julgamento
   nucleo/resposta      composição nas 7 seções padronizadas
```

## Princípios técnicos

1. **Texto canônico por página.** O texto de cada página é preservado com
   normalização apenas de espaços (ver `extracao.NORMALIZACAO`). Toda unidade
   (dispositivo) guarda `segmentos = [[página, início, fim], …]`; o texto exibido
   é reconstruído deles. A reconstrução é refeita no processamento, na indexação e
   nos testes (`citacoes.verificar_unidades`), e a reextração independente do PDF
   deve coincidir com as páginas gravadas.
2. **A LLM nunca produz citações.** Ela recebe evidências prontas (E1…En) e só
   pode referir-se a elas; trechos entre «» são conferidos literalmente contra a
   evidência citada. Afirmações sem evidência, com citação inexistente, com baixa
   correspondência ou com juízo de culpa são removidas antes da exibição.
3. **Aprovação é humana.** A máquina de estados (`esquema.TRANSICOES`) impede que
   processos automáticos aprovem ou publiquem; `revisao.py` recusa responsáveis
   como "claude", "ia", "coletor" etc.
4. **Sem servidor.** Tudo que roda para o usuário é estático (HTML/CSS/JS + JSON).
   A pergunta não sai do navegador. O modelo de IA, quando habilitado, é baixado
   uma vez e executado localmente.
5. **Partes de compilações.** Arquivos que reúnem vários textos (ex.: Código de
   Ética + Lei 8.662/93 + Lei 12.317/10) recebem um mapa de partes em
   `dados/configuracao/partes/<id>.json`, vinculado ao SHA-256 do arquivo; se o
   arquivo mudar, o mapa é invalidado e o documento volta à conferência.

## Formatos

- Registro de catálogo: ver `pipeline/gpecss/esquema.py` (`registro_vazio`,
  `CAMPOS_OBRIGATORIOS`, vocabulários controlados).
- Texto processado: `dados/textos/<id>/<versão>.json` com `paginas`, `partes`,
  `unidades`, `extrator`, `normalizacao`.
- Índice da aplicação: `{formato, modo, gerado_em, aviso, hash_conteudo,
  documentos[], unidades[]}` — `unidades[].id = "<doc>#<parte>:<dispositivo>"`.

## Hospedagem prevista (gratuita)

- **Aplicação:** Cloudflare Pages, plano gratuito, endereço `*.pages.dev`
  (limites confirmados em 26/10/2026 na documentação oficial: 25 MiB por arquivo,
  20.000 arquivos por site, 500 builds/mês; sem limite de banda publicado para
  conteúdo estático). Alternativa: GitHub Pages (repositório público).
- **Código e rotina de coleta:** GitHub (repositório público) + GitHub Actions
  (gratuito para repositórios públicos). A rotina só descobre e baixa; a
  conferência continua humana.
- **Site institucional (Wix gratuito):** link para a aplicação. Incorporação por
  iframe depende de decisão e de alteração no site (ver DECISIONS.md, pendências).
- **Modelos de IA:** pesos servidos pelo Hugging Face (repositórios `mlc-ai`) e
  biblioteca WebLLM pelo jsDelivr, com versão fixada (`0.2.85`).

## Tamanho e desempenho

- Índice atual (prévia, 1 documento): ~100 KB. Estimativa para ~150 documentos
  normativos: 5–10 MB (comprimido pelo servidor a ~1–2 MB). Se crescer além disso,
  dividir o índice por documento e carregar sob demanda.
- Modelos: Qwen3.5-4B ≈ 2,4 GB; Qwen3.5-9B ≈ 5,1 GB (download único, cache do
  navegador). Inviáveis na maioria dos celulares — ver DECISIONS.md.

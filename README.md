# GPECSS — Consulta Ético-Normativa CFESS-CRESS

Plataforma independente, gratuita e de código aberto para consulta às normas do
exercício profissional do Serviço Social brasileiro, com **citações literais
verificáveis** de documentos oficiais do Conjunto CFESS-CRESS.

**Idealização:** Vinícius Araújo Pereira, assistente social.

> Ferramenta de pesquisa e apoio informativo. Não é manifestação do CFESS ou de
> qualquer CRESS e não substitui orientação, fiscalização, pareceres ou
> deliberações dos órgãos competentes.

## Estado atual (resumo)

| Componente | Situação |
|---|---|
| Coleta automática no portal do CFESS | funcionando (descoberta de ~470 páginas; download e verificação por SHA-256) |
| Extração por página, segmentação em dispositivos, autoverificação literal | funcionando, testado com o Código de Ética (10ª ed.) |
| Fila de conferência humana (aprovar / rejeitar / publicar) | funcionando via linha de comando |
| Busca por termos (BM25 + Snowball-pt + tesauro do domínio + prioridade para normas citadas) | funcionando; 91,7% das 122 perguntas de avaliação atendidas, recall@8 0,843 (gabarito não revisado) |
| Busca por sentido (semântica) | opcional, ativada pela própria pessoa (modelo de ~120 MB no navegador); combinada à busca por termos (D36) |
| Interface | tema escuro (claro opcional), instalável como aplicativo (celular e computador), funciona sem internet, testada em Chrome e Edge (D37) |
| Análise por LLM local (WebLLM) | integrada; **opcional, ativada pela própria pessoa** após diagnóstico do aparelho; bloqueada na versão pública até a revisão profissional (D17) |
| Leituras críticas | 108 textos de acesso aberto sobre as normas (artigos, teses, publicações do CFESS/CRESS), com referência ABNT e link conferido; só indicação de leitura, fora das evidências e da IA (D40) |
| Acervo público | 59 normas nacionais do CFESS conferidas por pessoa responsável (inclusive revogadas e suspensas, com aviso) |

Detalhes em [docs/PROGRESS.md](docs/PROGRESS.md) e próximos passos em [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md).

## Estrutura

```
app/                 aplicação web estática (PWA) — é o que se publica
  js/nucleo/         busca, evidências, vigência, privacidade, verificação, resposta
  js/llm/            integração WebLLM (instruções e motor)
  dados/             índices gerados (acervo-publico.json; acervo-previa.json é local)
  dev/               páginas internas de avaliação (não publicar)
pipeline/gpecss/     coleta, extração, segmentação, conferência e indexação (Python)
dados/catalogo/      um registro JSON por documento (metadados, estado, histórico)
dados/configuracao/  mapas de partes conferíveis por documento
dados/brutos/        arquivos oficiais baixados (não versionados)
dados/textos/        texto extraído por página (não versionado; regenerável)
tests/               testes Python, testes JS e conjunto de avaliação (122 perguntas)
docs/                arquitetura, decisões, progresso, políticas e avaliação
```

## Requisitos

- Python 3.11+ com `requests`, `beautifulsoup4`, `lxml`, `pypdfium2`
  (`python -m pip install -r pipeline/requirements.txt`)
- Node.js 20+ (somente para testes e avaliação; a aplicação não tem etapa de build)
- Navegador com WebGPU apenas para a análise por IA (opcional)

## Uso do pipeline

Na pasta `pipeline/`:

```bash
python -m gpecss descobrir --categorias 3 9 4 1      # descobre documentos (metadados)
python -m gpecss baixar cfess-resolucao-1114-2025    # baixa e registra SHA-256
python -m gpecss processar cfess-resolucao-1114-2025 # extrai, segmenta, autoverifica
python -m gpecss fila --estado aguardando_conferencia
python -m gpecss mostrar cfess-resolucao-1114-2025   # resumo + lista de conferência
python -m gpecss aprovar cfess-resolucao-1114-2025 --responsavel "Nome" --situacao vigente_confirmada --assunto condicoes_eticas_tecnicas
python -m gpecss publicar cfess-resolucao-1114-2025 --responsavel "Nome"
python -m gpecss indexar --modo publico              # gera app/dados/acervo-publico.json
python -m gpecss indexar --modo previa               # índice interno com não conferidos
```

## Executar a aplicação localmente

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory app
```

Acesse `http://localhost:8765/`. Para a prévia interna (documentos não
conferidos, com aviso em destaque): `http://localhost:8765/?acervo=previa`.
Para testar a IA local (somente em `localhost`): abra o painel "Análise por IA no
meu dispositivo", confira o diagnóstico e ative.

## Testes

```bash
python -m unittest discover -s tests/python -v
node --test tests/js/*.test.mjs
node tests/avaliacao/avaliar.mjs previa --saida docs/avaliacao/linha-de-base.json
```

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md) · [Decisões](docs/DECISIONS.md) · [Progresso](docs/PROGRESS.md)
- [Próximos passos](docs/NEXT_STEPS.md) · [Segurança e privacidade](docs/SECURITY.md)
- [Política documental](docs/DOCUMENT_POLICY.md) · [Avaliação](docs/EVALUATION.md)

## Site institucional

https://gpecss2026.wixsite.com/gpecss (a aplicação tem hospedagem própria; a
integração com o site depende de decisão do grupo).

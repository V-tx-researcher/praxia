# PraxIA — seletor de intenção: protótipo local

## Abrir
Abra `index.html` no navegador, mantendo `data.js` e `engine.js` na mesma pasta. Funciona sem servidor, internet ou IA externa.

## Implementação
- 250 intenções originais únicas, chave `id`.
- Até três sugestões de *IDs de intenção distintos*; pontuação máxima entre variantes nunca gera opções duplicadas.
- O usuário pode optar por **continuar com sua pergunta original**.
- As 177 variantes históricas estão preservadas em `data.js`, mas **desativadas para a busca por padrão** porque não estão homologadas; ativação depende de revisão semântica.
- Respostas normativas preliminares não são publicadas nem exibidas.
- Emite evento `praxia:intent-selected` (CustomEvent) com `detail.type='intent'|'original'`. A busca original deve ser conectada apenas depois de integrar no repositório de desenvolvimento.
- O algoritmo atual é um baseline **lexical** simples para prototipagem de UX; não é a recuperação semântica/híbrida da PraxIA nem comprova acurácia. O limiar 0.25 é inicial e não calibrado.

## Teste de regressão local
Execute `node test_selector.js` nesta pasta. Verifica 250/250 perguntas canônicas com autoidentificação, exclusividade por ID, consulta muito curta e duplicatas.

## Integração econômica para o Claude
1. Inspecionar somente `LEIA_PRIMEIRO.md`, `engine.js`, `index.html` e os campos de `data.js`; não imprimir as 250 perguntas no contexto.
2. Copiar interface para área experimental do repositório, sem alterar produção nem o índice atual.
3. Ligar a ação `original` ao fluxo de recuperação atual; para `intent`, usar a pergunta canônica *apenas como sugestão confirmada*, sem adicionar automaticamente vínculos das FAQs.
4. Garantir `max=3`, `unique intent.id`, fallback de busca original e ausência de respostas não homologadas.
5. Rodar testes locais e testes de interface. Não dar push sem autorização.

## Limites
O teste de identificação exata é uma verificação de consistência, **não** uma avaliação cega de desempenho. Para avaliar utilidade: usar perguntas reais/parafraseadas não vistas, medir Top@1/3 **por ID distinto**, taxa de rejeição, taxa de confusão, latência e cliques de 'nenhuma destas'. Não ajustar em validação/teste cego.

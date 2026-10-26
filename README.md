# GPECSS — Consulta Ético-Normativa CFESS-CRESS

Projeto de plataforma independente de pesquisa documental e
análise ético-normativa para o Serviço Social brasileiro.

## Princípios

- Gratuidade.
- Confiabilidade acima da velocidade.
- Fontes documentais oficiais.
- Trechos comprobatórios.
- Controle de vigência.
- Revisão humana do acervo.
- LLM integrada à interface.
- Proteção de dados.
- Encaminhamento institucional adequado.

## Estado atual

Este é um protótipo inicial de interface e pesquisa documental.

IMPORTANTE: A LLM ainda não está integrada.
O acervo documental começa vazio.
O código não está validado para utilização profissional pública.

## Executar localmente

Na pasta raiz do projeto, execute:

python -m http.server 8000

Depois acesse:

http://localhost:8000/app/

É necessário ter Python instalado.

## Próximas etapas para o Claude

1. Auditar esta estrutura.
2. Construir coletor oficial de documentos CFESS-CRESS.
3. Implementar metadados e controle de vigência.
4. Implementar aprovação humana.
5. Construir busca híbrida lexical e semântica.
6. Integrar LLM local dentro da aplicação.
7. Validar citações literais com os documentos originais.
8. Criar testes ético-normativos.
9. Preparar PWA.
10. Integrar com o site gratuito do GPECSS.

## Site institucional

https://gpecss2026.wixsite.com/gpecss
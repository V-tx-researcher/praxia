# Segurança, privacidade e proteção de dados

## Dados das pessoas usuárias

| Aspecto | Implementação | Verificado por |
|---|---|---|
| Cadastro | não existe | — |
| Armazenamento da pergunta | não há; nada é gravado no navegador ou enviado a servidor | revisão de código (`app/js`) |
| Dados pessoais na pergunta | CPF, CNPJ, nº de processo, e-mail, telefone, NIS/SUS, data de nascimento e nomes após termos como "usuária", "paciente", "criança" são mascarados antes de qualquer processamento | `tests/js/nucleo.test.mjs` (privacidade); avaliação Q112–Q113 |
| Envio a terceiros | a pergunta não é enviada; o navegador baixa apenas a interface, o índice e (se habilitada) a biblioteca WebLLM e os pesos do modelo | CSP `connect-src` restrita |
| Rastreamento | sem cookies, analytics ou pixels | revisão de código |
| Histórico | não implementado (decisão: privacidade por padrão) | — |
| Preferência de IA | apenas "ligada/desligada" e o modelo escolhido, em `localStorage` do próprio navegador (chave `gpecss-preferencia-ia`); nenhuma pergunta é gravada | revisão de código (`app.js`) |

**Limitação:** a detecção de nomes é heurística. Nomes sem termo indicativo
("Maria pediu…") não são detectados. A interface orienta a não incluir dados
identificáveis.

**Provedores envolvidos ao usar a IA:** jsDelivr (biblioteca), Hugging Face
(pesos) e GitHub (bibliotecas WebGPU compiladas). Esses provedores recebem o
endereço IP e o pedido dos arquivos, **não** o conteúdo da pergunta.

## Política de Segurança de Conteúdo (CSP)

`default-src 'self'; script-src 'self' blob: https://cdn.jsdelivr.net 'wasm-unsafe-eval';
connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com;
style-src 'self'; form-action 'none'; base-uri 'self'` — scripts embutidos são
bloqueados (confirmado em teste: a página de avaliação com script inline foi
bloqueada pela própria CSP).

`blob:` em `script-src` (D37): o ONNX Runtime, usado pela busca por sentido opcional,
cria seu módulo de cálculo como blob. Um blob só pode ser criado por código já em
execução na página (do próprio site ou das bibliotecas fixadas por versão no
jsDelivr); scripts embutidos no HTML continuam bloqueados. A busca por sentido baixa
o modelo do Hugging Face (`connect-src`), que recebe IP e pedido do arquivo, não a
pergunta.

## Injeção de instruções (prompt injection)

1. No processamento, padrões de instruções dirigidas a modelos ("ignore as
   instruções", "você é um assistente", tags `<system>` etc.) geram alerta
   `possivel_instrucao_embutida` para a conferência humana.
2. Na montagem do prompt, `<` e `>` do conteúdo dos documentos e da pergunta são
   substituídos por `‹ ›`, de modo que um documento não pode fechar o bloco
   `<evidencia>` nem abrir outro (teste "prompt: conteúdo do documento não fecha a
   tag de evidência").
3. As instruções do sistema determinam tratar evidências como dados.
4. Independentemente do que o modelo produza, a verificação descarta afirmações
   sem fundamentação literal e bloqueia juízos de culpa.

## Integridade do acervo

- SHA-256 de cada arquivo oficial registrado na coleta e reconferido no
  processamento e na indexação; divergência interrompe a indexação.
- Reextração independente do PDF nos testes deve coincidir com o texto gravado.
- Alteração do arquivo na fonte devolve o documento ao estado `baixado` e
  invalida o mapa de partes: nova conferência é obrigatória.
- `hash_conteudo` no índice permite detectar alterações no arquivo publicado.

## Coleta responsável

- Respeita `robots.txt` (o do CFESS permite tudo em 26/10/2026), 1 requisição a
  cada 2 s por servidor, limite de 80 MB por arquivo, User-Agent identificado.
- O Planalto recusou conexões automatizadas no teste de 26/10/2026; a Lei 8.662/93
  está disponível no próprio livreto oficial do CFESS.

## Pendências

- Revisão de acessibilidade com leitor de tela real (NVDA/TalkBack).
- Cabeçalhos HTTP equivalentes à CSP na hospedagem (`_headers` do Cloudflare Pages),
  incluindo `frame-ancestors` se houver incorporação no Wix.

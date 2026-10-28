# Prompt para o levantamento de literatura crítica (ChatGPT, modo agente)

Objetivo: montar a seção **"Leituras críticas"** da plataforma. São artigos, livros e
teses de **acesso aberto** que analisam criticamente as normas do exercício profissional
do Serviço Social. A seção serve a docentes, estudantes e profissionais, com referência,
resumo e link. **A IA da plataforma não usa esses textos para responder.** Eles aparecem
como leitura complementar, separados das normas (camada 3).

## Etapas

1. Abra o ChatGPT no modo de trabalho com navegação (agente).
2. Copie e cole o texto entre as linhas `=====`.
3. Faça **um bloco temático por vez**: troque, no fim do prompt, a linha
   `BLOCO DESTA RODADA:` por um dos blocos da lista. São 8 blocos. Rodadas menores dão
   resultado mais confiável do que pedir tudo de uma vez.
4. Ao final de cada rodada, peça o arquivo CSV e salve nesta pasta com o nome
   `literatura_bloco_N.csv` (N = número do bloco).
5. Me avise no chat quando terminar (pode ser bloco por bloco). Eu confiro os links,
   tiro os itens repetidos e monto a seção. Você não precisa ler os textos agora.

Os blocos temáticos:

1. Código de Ética de 1993: fundamentos, princípios, projeto ético-político.
2. Lei de Regulamentação (Lei 8.662/1993), competências e atribuições privativas
   (inclui Res. CFESS 557/2009, 569/2010 e 383/1999 — Serviço Social na saúde).
3. Sigilo profissional, documentos técnicos (estudo social, laudo, parecer) e
   salvaguarda de material sigiloso (Res. CFESS 1.098/2025; ON CFESS 4/2020); atuação
   como perito/testemunha e "depoimento sem dano" (Res. 554/2009 e 559/2009).
4. Condições éticas e técnicas de trabalho (Res. CFESS 1.114/2025, antiga 493/2006),
   jornada de 30 horas (Lei 12.317/2010), precarização e trabalho remoto (ON 3/2020).
5. Fiscalização profissional e Política Nacional de Fiscalização (Res. CFESS 512/2007
   e 828/2017), registro e inscrição.
6. Processo ético e disciplinar, penalidades, desagravo público (Res. CFESS 660/2013,
   657/2013, 1.073/2024).
7. Supervisão de estágio e formação profissional (Res. CFESS 533/2008; Política
   Nacional de Estágio da ABEPSS).
8. Direitos humanos e combate às discriminações no exercício profissional: orientação
   sexual e identidade de gênero (Res. 489/2006, 785/2016, 845/2018), questão
   étnico-racial (Res. 1.054/2023), pessoas com deficiência (Res. 992/2022) e laicidade
   (Res. 1.084/2024).

=====================================================================

Você vai fazer um levantamento bibliográfico para uma plataforma gratuita de consulta
ética e normativa do Serviço Social no Brasil. Preciso de textos que ANALISEM
CRITICAMENTE as normas do Conjunto CFESS-CRESS do bloco temático indicado no final.
Esses textos serão apresentados como "leituras críticas", com referência e link, para
assistentes sociais, docentes e estudantes.

O QUE PROCURAR
- Artigos de periódicos científicos, livros e capítulos, teses e dissertações,
  publicações da ABEPSS, do CFESS/CRESS (cadernos, brochuras, CFESS Manifesta) e de
  grupos de pesquisa.
- Somente textos de ACESSO ABERTO, com texto integral disponível gratuitamente
  (sem login e sem pagamento).
- Textos em português que discutam, interpretem ou critiquem as normas do bloco: a
  origem, as tensões na aplicação, os limites, as disputas e os avanços. Inclua
  posições diferentes: leituras favoráveis, críticas e divergentes.
- Prefira textos a partir de 2000. Inclua clássicos anteriores só se forem muito citados.

ONDE PROCURAR (em ordem)
1. SciELO (https://www.scielo.br) e os periódicos da área: Serviço Social & Sociedade,
   Revista Katálysis, Temporalis (ABEPSS), Libertas (UFJF), Em Pauta (UERJ), O Social em
   Questão (PUC-Rio), Textos & Contextos (PUCRS), SER Social (UnB), Praia Vermelha
   (UFRJ), Argumentum (UFES), Serviço Social em Revista (UEL), Revista de Políticas
   Públicas (UFMA).
2. Portal de Periódicos CAPES (acesso aberto), Google Acadêmico e BDTD
   (https://bdtd.ibict.br) para teses e dissertações; repositórios das universidades.
3. Portais do CFESS (https://www.cfess.org.br), da ABEPSS e dos CRESS.

REGRAS OBRIGATÓRIAS (para não haver erro)
1. Só inclua um texto se você ABRIU a página e confirmou: título, autoria, ano, onde
   foi publicado e que o texto integral está aberto. Nunca invente ou "complete" uma
   referência de memória.
2. Se tiver dúvida sobre qualquer dado, deixe o campo vazio e escreva "conferir" na
   coluna de observações. Não adivinhe.
3. O resumo deve ser escrito com as suas palavras, em 2 ou 3 frases, sem copiar trechos
   longos. Diga qual é a tese ou a crítica principal do texto.
4. Indique quais normas o texto discute (número/ano) e em que parte, se possível
   (seção ou páginas).
5. Não inclua: textos pagos ou fechados, blogs sem autoria, vídeos, apresentações,
   textos gerados por IA, sites de "resumos" e trabalhos de conclusão de curso de
   graduação (TCC).
6. Busque entre 15 e 30 textos por bloco. Qualidade e verificação valem mais do que
   quantidade.
7. Escreva em português do Brasil.

ENTREGA: arquivo CSV (separador ponto e vírgula, codificação UTF-8) com UMA LINHA POR
TEXTO e exatamente estas colunas, nesta ordem:

bloco;tipo;autoria;titulo;ano;publicado_em;volume_numero_paginas;link_texto_integral;doi;licenca;normas_discutidas;temas;resumo;posicao;publico_sugerido;acesso_verificado_em;observacoes

Como preencher:
- tipo: artigo | livro | capitulo | tese | dissertacao | publicacao_institucional
- autoria: SOBRENOME, Nome; SOBRENOME, Nome (como na ABNT)
- publicado_em: nome do periódico, da editora ou da instituição
- link_texto_integral: link direto para o PDF ou a página com o texto completo
- doi: só se houver (formato 10.xxxx/...)
- licenca: ex. CC BY 4.0, CC BY-NC 4.0; se não informada, "não informada"
- normas_discutidas: ex. "Código de Ética 1993; Res. CFESS 533/2008"
- temas: palavras-chave separadas por vírgula
- resumo: 2 ou 3 frases, com as suas palavras
- posicao: favoravel | critica | divergente | historica | descritiva
- publico_sugerido: profissionais | docentes | estudantes (pode ser mais de um)
- acesso_verificado_em: data em que você abriu o link (AAAA-MM-DD)

Depois do CSV, escreva:
- quantos textos foram incluídos;
- quais buscas fez (onde e com quais termos);
- o que não conseguiu verificar e por quê.

BLOCO DESTA RODADA: [cole aqui um dos 8 blocos da lista]

=====================================================================

## O que eu faço com o resultado

- Abro cada link e confiro título, autoria, ano e se o texto é mesmo aberto. Itens
  sem confirmação ficam de fora.
- Tiro os repetidos entre blocos e monto as referências em ABNT.
- Ligo cada texto às normas do acervo, para que, ao consultar o Código de Ética, por
  exemplo, apareçam também as leituras críticas sobre ele.
- Exibo só a referência, o resumo e o link para o texto original: a plataforma não
  copia nem guarda o texto dos artigos (direitos autorais).

# Política documental

## Escopo do acervo principal

Incluídos prioritariamente: Código de Ética Profissional; Lei nº 8.662/1993 e
legislação diretamente pertinente; resoluções do CFESS sobre exercício
profissional; normativas dos CRESS; pareceres jurídicos e técnicos oficiais;
notas técnicas e orientações normativas; documentos orientativos da fiscalização;
instrumentos sobre atribuições, competências, sigilo, supervisão, registro e
condições éticas e técnicas.

Fora do acervo principal: notícias, campanhas, peças publicitárias, conteúdos
opinativos e atos administrativos internos (concursos, eleições, nomeações,
diárias, orçamento, anuidades — salvo quando alterem dever ou infração
profissional, como a Res. CFESS 954/2020).

Categorias do portal do CFESS coletadas: 3 (Regulamentação da profissão),
4 (Resoluções), 1 (Portarias) e 9 (Orientações Normativas). Não coletadas: 6
(Legislações sociais), 7 (Diretrizes curriculares), 8 (Graduação a distância).
Atos com termos administrativos recebem o alerta `possivel_ato_administrativo`;
a decisão de escopo é da pessoa que confere.

## Ciclo de vida

`descoberto → baixado → processado → aguardando_conferencia → aprovado → publicado`,
com `erro_download`, `erro_extracao`, `rejeitado` e `fora_do_escopo`. Somente
pessoas aprovam, rejeitam, marcam fora do escopo ou publicam. Documentos com
extração insuficiente (OCR necessário) ficam em `erro_extracao` e não podem ser
aprovados.

## Situação normativa (vocabulário controlado)

`vigente_confirmada`, `alterada`, `revogada`, `historica`, `nao_verificada`.
Nenhuma situação é alterada automaticamente. O coletor registra como **alerta**
as indicações escritas no portal (ex.: "Revogada integralmente pela Resolução
CFESS nº 1.114/2025") e o processamento lista as normas mencionadas no texto
com indício de alteração/revogação. Documentos revogados permanecem no acervo,
sinalizados; perguntas sobre fatos passados são comparadas com as datas de
vigência registradas.

## Conferência humana — lista mínima

1. O arquivo corresponde ao documento indicado na página oficial?
2. Título, número, ano, órgão e tipo estão corretos?
3. A situação normativa foi verificada em fonte oficial?
4. Alterações e revogações foram registradas (campos `altera`, `revoga`,
   `alterado_por`, `revogado_por`)?
5. A divisão em partes e dispositivos está correta (mapa de partes, quando houver)?
6. Os trechos de amostra conferem com o PDF nas páginas indicadas?
7. Os alertas automáticos foram resolvidos?
8. A redistribuição do arquivo é permitida?

## Redistribuição e direitos

- Atos oficiais (leis, decretos, resoluções, regulamentos) não têm proteção
  autoral (Lei nº 9.610/1998, art. 8º, IV). Seus textos podem compor o índice.
- Textos editoriais que acompanham as normas (apresentações, introduções,
  créditos) podem ter direitos reservados — o livreto do Código de Ética traz
  "Direitos desta Edição reservados ao CFESS". Por padrão eles **não entram no
  índice público** (`indice.PARTES_NAO_PUBLICAS`), apenas na prévia interna.
- PDFs originais **não são republicados**: a aplicação aponta para o endereço
  oficial (`redistribuicao = link_e_excertos`). Mudar isso exige decisão registrada.
- O repositório não versiona os PDFs (`dados/brutos/`) nem o texto integral
  extraído (`dados/textos/`); ambos são reobtidos pelo pipeline a partir das
  fontes oficiais, com verificação de SHA-256.

## Canais institucionais citados pela aplicação

Somente endereços conferidos em fonte oficial (`app/js/nucleo/orientacao.js`):

| Canal | Endereço | Verificado em |
|---|---|---|
| Endereços dos CRESS e Seccionais (portal do CFESS) | https://www.cfess.org.br/pagina/view/24 | 26/10/2026 |
| Legislação do CFESS | https://www.cfess.org.br/legislacao/index | 26/10/2026 |

Os textos sobre COFI/SubCOFI na orientação institucional ainda precisam ser
fundamentados na Política Nacional de Fiscalização (Res. CFESS 512/2007) assim
que ela for conferida — ver NEXT_STEPS.md.

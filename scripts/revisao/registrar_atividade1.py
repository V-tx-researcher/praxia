"""Registra no catálogo as respostas da Atividade de conferência nº 1 (Código de Ética).

Respostas do revisor (assistente social), recebidas em 27/10/2026 no arquivo
docs/revisao/Atividade_01_Codigo_de_Etica.docx. As relações entre normas foram
conferidas no texto oficial das Res. CFESS 594/2011, 954/2020 e 970/2021 antes do
registro; as que não puderam ser conferidas ficam em `pendencias_conferencia`.

Uso (a partir de pipeline/): python ../scripts/revisao/registrar_atividade1.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))

from gpecss import catalogo, revisao  # noqa: E402

RESPONSAVEL = "revisao-profissional"  # D19: sem identificação pessoal
CEP = "cfess-codigo-etica-1993"

r = catalogo.carregar(CEP)
r["edicao"] = "10ª edição revista e atualizada (publicação do CFESS de 2012)"
r["nota_vigencia"] = (
    "Código de Ética vigente, instituído pela Resolução CFESS nº 273/1993, com alterações posteriores "
    "(Resoluções CFESS nº 290/1994, 293/1994, 333/1996, 594/2011, 954/2020 e 970/2021). "
    "A alínea c do Art. 22 teve a revogação anulada pela Res. 970/2021, com processos e penalidades "
    "suspensos; o parágrafo único do Art. 25 foi revogado."
)
r["alteracoes"]["alterado_por"] = [
    {"id": "cfess-resolucao-594-2011", "verificado": True,
     "descricao": "Numeração romana dos princípios, correções ortográficas, 'orientação sexual' e 'identidade de gênero', linguagem de gênero (Arts. 1º a 4º)."},
    {"id": "cfess-resolucao-954-2020", "verificado": True,
     "descricao": "Revogou a alínea c do Art. 22 e o parágrafo único do Art. 25 (Art. 3º, I); a revogação da alínea c foi anulada pela Res. 970/2021."},
    {"id": "cfess-resolucao-970-2021", "verificado": True,
     "descricao": "Anulou a revogação da alínea c do Art. 22 (Art. 1º), manteve extinta a suspensão por débito revogando o parágrafo único do Art. 25 (Art. 2º) e suspendeu os processos da alínea c do Art. 22 (Art. 4º)."},
    {"referencia": "Resolução CFESS nº 290/1994", "verificado": False,
     "descricao": "Citada no próprio Código (p. 43 do PDF) e na Res. 594/2011, Art. 5º; texto não localizado no portal."},
    {"referencia": "Resolução CFESS nº 293/1994", "verificado": False,
     "descricao": "Citada na Res. 594/2011, Art. 5º; texto não localizado no portal."},
    {"referencia": "Resolução CFESS nº 333/1996", "verificado": False,
     "descricao": "Citada na Res. 594/2011, Art. 5º; texto não localizado no portal."},
]
r["dispositivos_afetados"] = [
    {"unidade": "cep:art-22:ali-c", "situacao": "vigente_com_ressalva",
     "nota": ("a Resolução CFESS nº 954/2020 revogou esta alínea, mas a Resolução CFESS nº 970/2021 (Art. 1º) anulou a "
              "revogação e restabeleceu sua vigência. Os processos que apuram esta infração e a aplicação de penalidades "
              "estão suspensos até deliberação no fórum nacional da categoria (Res. CFESS nº 970/2021, Art. 4º)."),
     "fontes": ["cfess-resolucao-970-2021#texto:art-1", "cfess-resolucao-970-2021#texto:art-4",
                "cfess-resolucao-954-2020#texto:art-3:inc-1"]},
    {"unidade": "cep:art-25:par-unico", "situacao": "revogado",
     "nota": ("revogado pela Resolução CFESS nº 954/2020 (Art. 3º, inciso I), mantido revogado pela Resolução CFESS "
              "nº 970/2021 (Art. 2º), que extinguiu a penalidade de suspensão do exercício profissional por débito."),
     "fontes": ["cfess-resolucao-954-2020#texto:art-3:inc-1", "cfess-resolucao-970-2021#texto:art-2"]},
]
r["pendencias_conferencia"] = [
    "Art. 25, caput — o revisor indicou possível alteração pelas Res. 290/1994 e 333/1996; textos não localizados no portal.",
    "Art. 20, alínea a — o revisor indicou possível alteração pela Res. 290/1994; texto não localizado no portal.",
    "Res. 293/1994 — dispositivos alterados a identificar.",
]
r["assunto_principal"] = "exercicio_profissional"
r["assuntos_secundarios"] = ["direitos_profissionais", "deveres_profissionais", "vedacoes", "sigilo_profissional",
                             "processo_etico", "relacao_usuarios", "relacoes_profissionais"]
catalogo.salvar(r)

revisao.aprovar(
    CEP, RESPONSAVEL, "alterada",
    observacoes=("Atividade de conferência nº 1 (27/10/2026): arquivo oficial confirmado; título, tipo e órgão conferem; "
                 "ano 1993 refere-se à norma (Res. 273/1993) e a edição é de 2012; divisão em partes confere; "
                 "6/6 amostras iguais ao PDF; situação: vigente com alterações (Art. 22 c com ressalva; Art. 25 p.ú. revogado); "
                 "divulgação: apenas link oficial e trechos. Sugestão do revisor: incluir todas as resoluções e "
                 "documentos legais do Conjunto CFESS-CRESS."),
    redistribuicao="link_e_excertos",
)
revisao.publicar(CEP, RESPONSAVEL)

# Res. 954/2020: transcrição humana do trecho perdido na extração (não substitui o
# texto extraído; a conferência própria da 954/2020 ainda está pendente).
r954 = catalogo.carregar("cfess-resolucao-954-2020")
r954["transcricoes_conferidas"] = [{
    "pagina": 2, "dispositivo": "Art. 3º, inciso I",
    "texto": "I - a alínea “c” do artigo 22 e o parágrafo único do artigo 25 da Resolução CFESS nº 273/1993.",
    "origem": "transcrição do revisor a partir do PDF oficial (Atividade nº 1, 27/10/2026)",
}]
catalogo.salvar(r954)
print("Código de Ética:", catalogo.carregar(CEP)["estado_fluxo"])

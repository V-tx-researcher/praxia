"""Registra a Atividade de conferência nº 3 (lote 1), respondida em 27/10/2026.

Relações entre normas registradas como verificadas foram conferidas no texto
oficial pelo desenvolvimento antes do registro (ver docs/revisao/REGISTRO.md).

Uso (na raiz): python scripts/revisao/registrar_atividade3.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from gpecss import catalogo, processamento, revisao  # noqa: E402
from gpecss.esquema import transitar  # noqa: E402

RESP = "revisao-profissional"
OBS = "Atividade de conferência nº 3 (lote 1, 27/10/2026): arquivo oficial confirmado; amostras conferem com o PDF."

# 1. Res. 512/2007: o anexo (Política Nacional de Fiscalização) começa na p. 8 e
#    estava sendo lido como continuação do Art. 21. Mapa de partes declarado.
r = catalogo.carregar("cfess-resolucao-512-2007")
sha = next(a for a in r["arquivos"] if a["papel"] == "principal")["sha256"]
processamento.salvar_mapa_partes("cfess-resolucao-512-2007", [
    {"rotulo": "Resolução CFESS nº 512/2007", "tipo": "normativa", "slug": "texto", "pagina_inicio": 1, "pagina_fim": 7},
    {"rotulo": "Anexo — Política Nacional de Fiscalização", "tipo": "normativa", "slug": "anexo-pnf",
     "pagina_inicio": 8, "pagina_fim": 10},
], sha, "desenvolvimento, após conferência do lote 1 (anexo começa na p. 8 do PDF)")
transitar(r, "processado", "processador", "mapa de partes do anexo")
catalogo.salvar(r)
processamento.processar("cfess-resolucao-512-2007")


def relacionar(id_, campo, itens):
    reg = catalogo.carregar(id_)
    reg["alteracoes"][campo] = itens
    catalogo.salvar(reg)


relacionar("cfess-resolucao-1114-2025", "revoga", [
    {"id": "cfess-resolucao-493-2006", "verificado": True, "descricao": "Revogação integral (Art. 21)."}])
relacionar("cfess-resolucao-1098-2025", "revoga", [
    {"id": "cfess-resolucao-556-2009", "verificado": True, "descricao": "Revogação integral (Art. 18)."}])
relacionar("cfess-resolucao-512-2007", "alterado_por", [
    {"id": "cfess-resolucao-828-2017", "verificado": True,
     "descricao": "Nova redação do Art. 17 (instrumentais da fiscalização) e do Art. 13, XIII (Termo de Visita de Fiscalização e Orientação)."}])
relacionar("cfess-resolucao-512-2007", "revoga", [
    {"referencia": "Resolução CFESS nº 382/1999", "verificado": True,
     "descricao": "Revoga as disposições em contrário (Art. 20)."}])
relacionar("cfess-resolucao-970-2021", "altera", [
    {"id": "cfess-resolucao-954-2020", "verificado": True,
     "descricao": "Anula a revogação da alínea c do Art. 22 do Código de Ética e dá nova redação aos Arts. 1º e 3º da Res. 954/2020."},
    {"id": "cfess-codigo-etica-1993", "verificado": True,
     "descricao": "Restabelece a alínea c do Art. 22; mantém revogado o parágrafo único do Art. 25; suspende processos (Art. 4º)."}])
relacionar("cfess-resolucao-594-2011", "altera", [
    {"id": "cfess-codigo-etica-1993", "verificado": True,
     "descricao": "Princípios em algarismos romanos, correções ortográficas, orientação sexual e identidade de gênero, linguagem de gênero."}])

r = catalogo.carregar("cfess-resolucao-970-2021")
r["nota_vigencia"] = ("Vigente. Erro material no texto oficial: os Arts. 2º e 3º referem-se à \"Resolução nº 954 de 2021\", "
                      "mas a resolução alterada é a nº 954/2020.")
catalogo.salvar(r)

r = catalogo.carregar("cfess-resolucao-512-2007")
r["nota_vigencia"] = "Vigente com alterações da Res. CFESS nº 828/2017 (Arts. 13, XIII, e 17). PDF em versão compilada; texto riscado retirado."
catalogo.salvar(r)

APROVAR = {
    "cfess-resolucao-1114-2025": ("vigente_confirmada", "condicoes_eticas_tecnicas", ["sigilo_profissional", "fiscalizacao_profissional"]),
    "cfess-resolucao-1098-2025": ("vigente_confirmada", "sigilo_profissional", ["documentos_tecnicos", "condicoes_eticas_tecnicas"]),
    "cfess-resolucao-533-2008": ("vigente_confirmada", "supervisao_estagio", ["formacao_profissional"]),
    "cfess-resolucao-557-2009": ("vigente_confirmada", "documentos_tecnicos", ["relacoes_profissionais", "atribuicoes_privativas"]),
    "cfess-resolucao-512-2007": ("alterada", "fiscalizacao_profissional", []),
    "cfess-resolucao-970-2021": ("vigente_confirmada", "processo_etico", []),
    "cfess-resolucao-594-2011": ("vigente_confirmada", "exercicio_profissional", ["relacao_usuarios"]),
}
NOTAS = {
    "cfess-resolucao-557-2009": " Observação: as justificativas escritas no formulário referiam-se à Res. 533/2008 (provável troca de campo); as marcações da 557/2009 foram consideradas.",
    "cfess-resolucao-512-2007": " Trechos riscados retirados confirmados pelo revisor.",
    "cfess-resolucao-594-2011": " O Art. 5º inclui a assinatura da presidente (texto literal do PDF).",
}
for id_, (situacao, assunto, secundarios) in APROVAR.items():
    revisao.aprovar(id_, RESP, situacao, assunto, secundarios, OBS + NOTAS.get(id_, ""), "link_e_excertos")
    revisao.publicar(id_, RESP)
    print("publicado:", id_)

# Res. 954/2020: conferência registrada, sem aprovação (texto com lacunas de extração).
r = catalogo.carregar("cfess-resolucao-954-2020")
r["transcricoes_conferidas"] = [
    {"pagina": 2, "dispositivo": "Art. 3º, inciso I",
     "texto": "I - a alínea “c” do artigo 22 e o parágrafo único do artigo 25 da Resolução CFESS nº 273/1993.",
     "origem": "transcrição do revisor (Atividade nº 1)"},
    {"pagina": 2, "dispositivo": "Art. 3º, inciso III",
     "texto": "III - a alínea “e” do artigo 54 e os parágrafos quarto, quinto e sexto do artigo 78 da Resolução CFESS nº 582/2010.",
     "origem": "transcrição do revisor (Atividade nº 3)"},
    {"pagina": 2, "dispositivo": "Art. 3º, inciso IV",
     "texto": "IV - o inciso IV do artigo 5º da Resolução CFESS nº 777/2016.",
     "origem": "transcrição do revisor (Atividade nº 3)"},
]
r["alteracoes"]["alterado_por"] = [
    {"id": "cfess-resolucao-970-2021", "verificado": True,
     "descricao": "Arts. 1º e 3º com nova redação; revogação da alínea c do Art. 22 do Código anulada."}]
r["conferencia_parcial"] = {
    "data": "2026-10-27", "situacao_indicada": "alterada",
    "pendencia": ("Amostras divergentes do PDF por falha de extração (Arts. 1º e 3º). Para aprovar: texto do Art. 1º "
                  "(trecho entre parênteses) transcrito ou OCR do PDF."),
}
catalogo.salvar(r)
print("954/2020: conferência parcial registrada; aguarda texto do Art. 1º")

"""Registra a Atividade de conferência nº 4 (lote 2), respondida em 27/10/2026.

O revisor respondeu com apoio de outra ferramenta de IA e marcou ele mesmo as
opções (diferente da primeira versão, só preenchida por IA — D27). Pediu que as
pendências restantes fossem resolvidas por pesquisa do desenvolvimento:
  - Res. 952/2020: vigência marcada "Não sei" → pesquisa no portal e em material
    do CFESS de 2026 (ver REGISTRO.md);
  - Res. 954/2020: texto do Art. 1º → transcrição registrada a partir da imagem
    do PDF oficial (dados/configuracao/transcricoes/), com verificação automática
    de que só acrescenta o que a extração perdeu.
Essas duas aprovações registram a origem na observação da conferência.

Uso (na raiz): python scripts/revisao/registrar_atividade4.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from gpecss import catalogo, processamento, revisao  # noqa: E402
from gpecss.esquema import transitar  # noqa: E402

RESP = "revisao-profissional"
OBS = ("Atividade de conferência nº 4 (lote 2, 27/10/2026), respondida pelo revisor com apoio de ferramenta de IA: "
       "arquivo oficial confirmado; amostras conferem com o PDF.")
DELEGADA = (" Pendência resolvida por pesquisa do desenvolvimento, por delegação expressa do revisor "
            "(27/10/2026): ")

LOTE = ["cfess-resolucao-660-2013", "cfess-resolucao-657-2013-p663", "cfess-resolucao-1073-2024",
        "cfess-resolucao-952-2020", "cfess-resolucao-934-2020", "cfess-resolucao-950-2020",
        "cfess-resolucao-569-2010", "cfess-resolucao-489-2006", "cfess-resolucao-992-2022",
        "cfess-resolucao-1054-2023", "cfess-resolucao-1084-2024", "cfess-resolucao-954-2020"]

# 1. Reprocessa com a separação da assinatura (pedido do revisor no Art. 4º da 950/2020)
#    e, na 954/2020, com a transcrição registrada.
for id_ in LOTE:
    r = catalogo.carregar(id_)
    if r["estado_fluxo"] == "aguardando_conferencia":
        transitar(r, "processado", "processador", "reprocessamento: assinatura separada do último artigo")
        catalogo.salvar(r)
    processamento.processar(id_, log=lambda *a: None)


def relacionar(id_, campo, itens):
    reg = catalogo.carregar(id_)
    reg["alteracoes"][campo] = itens
    catalogo.salvar(reg)


def anotar(id_, nota, afetados=None):
    reg = catalogo.carregar(id_)
    reg["nota_vigencia"] = nota
    if afetados is not None:
        reg["dispositivos_afetados"] = afetados
    catalogo.salvar(reg)


relacionar("cfess-resolucao-660-2013", "alterado_por", [
    {"id": "cfess-resolucao-938-2020", "verificado": True,
     "descricao": "Nova redação do Art. 15, § 2º (prazos em dias úteis) e dos Arts. 74 e 75 (prescrição)."},
    {"id": "cfess-resolucao-1013-2022", "verificado": True,
     "descricao": "Inclui o Art. 76 (falecimento da pessoa denunciada) e renumera os seguintes."}])
relacionar("cfess-resolucao-660-2013", "revoga", [
    {"referencia": "Resolução CFESS nº 428/2002", "verificado": True, "descricao": "Revogação integral (Art. 2º)."}])
relacionar("cfess-resolucao-1073-2024", "revoga", [
    {"referencia": "Resolução CFESS nº 443/2003", "verificado": True, "descricao": "Revogação integral (Art. 13)."}])
relacionar("cfess-resolucao-934-2020", "alterado_por", [
    {"id": "cfess-resolucao-950-2020", "verificado": True,
     "descricao": "Acrescenta parágrafo único ao Art. 9º e institui os modelos de certidão (Anexos I a IV)."}])
relacionar("cfess-resolucao-954-2020", "alterado_por", [
    {"id": "cfess-resolucao-970-2021", "verificado": True,
     "descricao": "Anula a revogação da alínea c do Art. 22 do Código de Ética e dá nova redação aos Arts. 1º e 3º."}])

anotar("cfess-resolucao-660-2013",
       "Vigente com alterações das Res. CFESS nº 938/2020 e 1.013/2022 (versão compilada; texto riscado retirado). "
       "A Res. CFESS nº 988/2022 disciplina a realização eletrônica dos atos e ritos deste Código.")
anotar("cfess-resolucao-657-2013-p663",
       "Vigente (versão compilada). Parágrafo único do Art. 30 retificado em 26/05/2015; a redação anterior, riscada, "
       "foi retirada. A Res. CFESS nº 988/2022 disciplina a realização eletrônica dos atos e ritos deste Código.")
anotar("cfess-resolucao-934-2020", "Vigente com o parágrafo único do Art. 9º acrescentado pela Res. CFESS nº 950/2020 (versão compilada).")
anotar("cfess-resolucao-950-2020",
       "Vigente. O texto oficial data a Res. 934/2020 de 23 de janeiro num considerando e de 28 de janeiro nos Arts. 1º e 2º "
       "(mantido como no original).")
anotar("cfess-resolucao-1084-2024", "Vigente. Ementa retificada no DOU de 13/12/2024 (nota na p. 4 do PDF).")
anotar("cfess-resolucao-569-2010",
       "Vigente. O parágrafo único do Art. 4º remete à Res. CFESS nº 428/2002, revogada pela Res. CFESS nº 660/2013 "
       "(Código Processual de Ética em vigor).",
       [{"unidade": "texto:art-4:par-unico", "situacao": "vigente_com_ressalva",
         "nota": ("a Resolução CFESS nº 428/2002, aqui citada, foi revogada pela Resolução CFESS nº 660/2013 (Art. 2º), "
                  "que regulamenta o Código Processual de Ética em vigor."),
         "fontes": ["cfess-resolucao-660-2013#texto:art-2"]}])
anotar("cfess-resolucao-954-2020",
       "Vigente com alterações da Res. CFESS nº 970/2021, que anulou a revogação da alínea c do Art. 22 do Código de Ética "
       "e deu nova redação aos Arts. 1º e 3º. Texto das págs. 1 e 2 completado por transcrição da imagem do PDF oficial.",
       [{"unidade": "texto:art-1", "situacao": "alterado",
         "nota": ("nova redação dada pela Resolução CFESS nº 970/2021 (Art. 2º): fica extinta apenas a penalidade de "
                  "suspensão do exercício profissional por débito; a infração da alínea c do Art. 22 do Código de Ética "
                  "foi restabelecida (Res. 970/2021, Art. 1º), com os processos suspensos (Art. 4º)."),
         "fontes": ["cfess-resolucao-970-2021#texto:art-1", "cfess-resolucao-970-2021#texto:art-2",
                    "cfess-resolucao-970-2021#texto:art-4"]},
        {"unidade": "texto:art-3:inc-1", "situacao": "alterado",
         "nota": ("a revogação da alínea c do Art. 22 do Código de Ética foi anulada pela Resolução CFESS nº 970/2021 "
                  "(Art. 1º); permanece revogado o parágrafo único do Art. 25."),
         "fontes": ["cfess-resolucao-970-2021#texto:art-1", "cfess-resolucao-970-2021#texto:art-3"]}])

r = catalogo.carregar("cfess-resolucao-954-2020")
r.pop("conferencia_parcial", None)
catalogo.salvar(r)

# Res. 952/2020 — conferência do arquivo pelo revisor; vigência pela pesquisa delegada.
anotar("cfess-resolucao-952-2020",
       "Vigente. Nenhuma norma posterior que a altere ou revogue foi localizada nas 682 páginas de legislação do portal "
       "do CFESS (ementas) nem nos textos já processados; o material do CFESS \"Outras publicações para processamento "
       "ético\" (2026) a lista entre as normas de referência.")

APROVAR = {
    "cfess-resolucao-660-2013": ("alterada", "processo_etico", []),
    "cfess-resolucao-657-2013-p663": ("vigente_confirmada", "processo_etico", ["fiscalizacao_profissional"]),
    "cfess-resolucao-1073-2024": ("vigente_confirmada", "direitos_profissionais", ["processo_etico"]),
    "cfess-resolucao-952-2020": ("vigente_confirmada", "processo_etico", []),
    "cfess-resolucao-934-2020": ("alterada", "processo_etico", ["sigilo_profissional"]),
    "cfess-resolucao-950-2020": ("vigente_confirmada", "processo_etico", []),
    "cfess-resolucao-569-2010": ("vigente_confirmada", "vedacoes", ["atribuicoes_privativas"]),
    "cfess-resolucao-489-2006": ("vigente_confirmada", "vedacoes", ["relacao_usuarios"]),
    "cfess-resolucao-992-2022": ("vigente_confirmada", "vedacoes", ["relacao_usuarios"]),
    "cfess-resolucao-1054-2023": ("vigente_confirmada", "vedacoes", ["relacao_usuarios"]),
    "cfess-resolucao-1084-2024": ("vigente_confirmada", "vedacoes", ["relacao_usuarios", "autonomia_profissional"]),
    "cfess-resolucao-954-2020": ("alterada", "processo_etico", ["registro_inscricao"]),
}
NOTAS = {
    "cfess-resolucao-660-2013": " Trechos riscados retirados confirmados pelo revisor (págs. 6 e 18).",
    "cfess-resolucao-657-2013-p663": " Trecho riscado do Art. 30 confirmado pelo revisor.",
    "cfess-resolucao-952-2020": DELEGADA + "vigência (o revisor marcou \"Não sei\").",
    "cfess-resolucao-950-2020": " Assinatura separada do Art. 4º, a pedido do revisor.",
    "cfess-resolucao-569-2010": " O link do arquivo indicado não abriu para o revisor; ele conferiu exemplar do mesmo portal.",
    "cfess-resolucao-954-2020": (" Arquivo e amostras conferidos nas Atividades nº 1 e 3." + DELEGADA
                                 + "texto das págs. 1 e 2 completado por transcrição da imagem do PDF oficial; a verificação "
                                   "automática confirma que a transcrição só acrescenta o que a extração perdeu, e os "
                                   "incisos I, III e IV do Art. 3º coincidem com as transcrições do próprio revisor."),
}
for id_, (situacao, assunto, secundarios) in APROVAR.items():
    revisao.aprovar(id_, RESP, situacao, assunto, secundarios, OBS + NOTAS.get(id_, ""), "link_e_excertos")
    revisao.publicar(id_, RESP)
    print("publicado:", id_)

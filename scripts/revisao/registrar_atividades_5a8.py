"""Registra as Atividades de conferência nº 5 a 8 (lotes 3 a 6), respondidas em 27–28/10/2026.

O revisor respondeu com apoio do ChatGPT (prompt em docs/revisao/PROMPT_ChatGPT_pesquisa.md)
e marcou ele mesmo as opções. As relações entre normas registradas como verificadas
foram conferidas pelo desenvolvimento no texto oficial (ver docs/revisao/REGISTRO.md).

Divergência tratada: Orientação Normativa 2/2018 marcada "Vigente", mas revogada
expressamente pela Res. 1.031/2023, Art. 14 (texto oficial conferido) — registrada
como revogada, com aviso ao revisor (D31).

Uso (na raiz): python scripts/revisao/registrar_atividades_5a8.py
"""

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo, revisao  # noqa: E402

RESP = "revisao-profissional"
R = "cfess-resolucao-"
ON = "cfess-orientacao-normativa-"
OBS = {5: "Atividade de conferência nº 5 (lote 3, 27/10/2026)", 6: "Atividade de conferência nº 6 (lote 4, 27/10/2026)",
       7: "Atividade de conferência nº 7 (lote 5, 28/10/2026)", 8: "Atividade de conferência nº 8 (lote 6, 28/10/2026)"}
OBS_FIM = ", respondida pelo revisor com apoio de ferramenta de IA: arquivo oficial confirmado; amostras conferem com o PDF."


def rel(id_, campo, itens):
    r = catalogo.carregar(id_)
    r["alteracoes"][campo] = itens
    catalogo.salvar(r)


def nota(id_, texto, afetados=None):
    r = catalogo.carregar(id_)
    r["nota_vigencia"] = texto
    if afetados is not None:
        r["dispositivos_afetados"] = afetados
    catalogo.salvar(r)


def v(id_, descricao, ref=None):
    return ({"id": id_} if not ref else {"referencia": ref}) | {"verificado": True, "descricao": descricao}


# ---- Relações conferidas no texto oficial --------------------------------------
rel(R + "1014-2022", "alterado_por", [
    v(R + "1018-2023", "Arts. 1º e 3º: assinatura eletrônica (Art. 2º, § 2º) e início da vigência (Art. 49)."),
    v(R + "1068-2024", "Arts. 1º a 3º: Art. 2º, II e §§ 14 e 15; Art. 37."),
    v(None, "Arts. 1º a 4º: isenções e renumeração nos Arts. 40 e 41.", "Resolução CFESS nº 1.095/2025"),
    v(R + "1147-2026", "Arts. 1º a 8º: Art. 2º, §§ 16 e 17; Arts. 3º, 9º, 20, 31 e 42.")])
rel(R + "1014-2022", "revoga", [v(None, "Revoga os Arts. 27 a 78 (Art. 47).", "Resolução CFESS nº 582/2010")])
rel(R + "1015-2022", "alterado_por", [v(R + "1018-2023", "Art. 2º: § 2º do Art. 2º; Art. 4º: Art. 30.")])
rel(R + "1031-2023", "alterado_por", [v(R + "1116-2025", "Art. 1º: Art. 3º, II (vínculo de sócia/o).")])
rel(R + "1031-2023", "revoga", [v(R + "792-2017", "Revogação integral (Art. 14)."),
                                v(ON + "2-2018", "Revogação integral (Art. 14).")])
rel(R + "884-2018", "alterado_por", [v(None, "Ementa e caput do Art. 1º (Arts. 1º e 2º).", "Resolução CFESS nº 900/2019")])
rel(R + "988-2022", "revoga", [v(None, "Revoga as Res. 940/2020, 955/2020 e 968/2021 (Art. 34).",
                                 "Resoluções CFESS nº 940/2020, 955/2020 e 968/2021")])
rel(R + "548-2009", "alterado_por", [v(R + "726-2015", "Complementa e altera (Arts. 1º a 3º)."),
                                     v(R + "943-2020", "Parágrafo único do Art. 5º (Art. 1º)."),
                                     v(None, "§ 1º do Art. 5º.", "Resolução CFESS nº 1.103/2025")])
for id_ in (R + "555-2009", R + "560-2009"):
    rel(id_, "revogado_por", [v(None, "Revogação integral (Art. 2º), com a Consolidação das Resoluções.",
                                "Resolução CFESS nº 582/2010")])
rel(R + "782-2016", "revogado_por", [v(R + "828-2017", "Revogação integral (Art. 3º).")])
rel(R + "828-2017", "revoga", [v(R + "782-2016", "Revogação integral (Art. 3º).")])
rel(R + "418-2001-p662", "alterado_por", [v(R + "467-2005", "Altera o § 1º e inclui o § 2º do Art. 1º.")])
rel(R + "443-2003", "revogado_por", [v(R + "1073-2024", "Revogação integral (Art. 13).")])
rel(R + "493-2006", "revogado_por", [v(R + "1114-2025", "Revogação integral (Art. 21).")])
rel(R + "513-2007", "revogado_por", [v(R + "556-2009", "Revogação integral (Art. 12).")])
rel(R + "556-2009", "revogado_por", [v(R + "1098-2025", "Revogação integral (Art. 18).")])
rel(R + "615-2011", "revogado_por", [v(R + "785-2016", "Revogação (Art. 7º).")])
rel(ON + "2-2018", "revogado_por", [v(R + "1031-2023", "Revogação integral (Art. 14).")])

# ---- Notas de vigência ---------------------------------------------------------
nota(R + "1014-2022", "Vigente com alterações das Res. CFESS nº 1.018/2023, 1.068/2024, 1.095/2025 e 1.147/2026 "
     "(versão compilada de 06/05/2026; texto riscado retirado).")
nota(R + "1015-2022", "Vigente com alterações da Res. CFESS nº 1.018/2023. Atenção: o PDF publicado pelo CFESS ainda traz "
     "a redação anterior do § 2º do Art. 2º e do Art. 30 (avisos nos próprios dispositivos).", [
    {"unidade": "texto:art-2:par-2", "situacao": "alterado",
     "nota": ("nova redação dada pela Resolução CFESS nº 1.018/2023 (Art. 2º): a assinatura eletrônica obedece ao "
              "inciso I do artigo 4º da Lei nº 14.063/2020."), "fontes": [R + "1018-2023#texto:art-2"]},
    {"unidade": "texto:art-30", "situacao": "alterado",
     "nota": "nova redação dada pela Resolução CFESS nº 1.018/2023 (Art. 4º): vigência a partir de 1º de março de 2023.",
     "fontes": [R + "1018-2023#texto:art-4"]}])
nota(R + "1068-2024", "Vigente. Ementa retificada no DOU de 13/12/2024 (nota no PDF). Altera a Res. CFESS nº 1.014/2022.")
nota(R + "1031-2023", "Vigente com a alteração da Res. CFESS nº 1.116/2025 (Art. 3º, II; versão compilada). "
     "Revogou a Res. 792/2017 e a Orientação Normativa 2/2018 (Art. 14).")
nota(R + "884-2018", "Vigente com as alterações da Res. CFESS nº 900/2019 (versão compilada). Remete a artigos da "
     "Res. 582/2010 que foram revogados pela Res. 1.014/2022 (Art. 47); a inscrição hoje segue a Res. 1.014/2022.")
nota(R + "548-2009", "Vigente com alterações das Res. CFESS nº 726/2015, 943/2020 e 1.103/2025 (versão compilada de "
     "junho de 2025). Remissões ao Código Processual de Ética de 2002 mantidas como no texto oficial.")
nota(R + "943-2020", "A redação que deu ao Art. 5º da Res. 548/2009 foi depois substituída pela Res. CFESS nº 1.103/2025; "
     "consulte a versão compilada da Res. 548/2009.")
nota(R + "726-2015", "Alterações incorporadas à versão compilada da Res. 548/2009, que é a referência atual.")
nota(R + "988-2022", "Vigente. Revogou as Res. 940/2020, 955/2020 e 968/2021 (Art. 34); efeitos desde 23/02/2022.")
for id_ in (R + "555-2009", R + "560-2009"):
    nota(id_, "Revogada integralmente pela Res. CFESS nº 582/2010 (Art. 2º, conferido no texto oficial).")
nota(R + "782-2016", "Revogada pela Res. CFESS nº 828/2017 (Art. 3º). Os instrumentais de fiscalização em vigor estão "
     "no Art. 17 da Res. 512/2007, com a redação da Res. 828/2017.")
nota(R + "707-2015", "Sem efeito atual: alterava os Arts. 28 a 77 da Res. 582/2010, que foram revogados pela "
     "Res. CFESS nº 1.014/2022 (Art. 47). Não foi localizada revogação expressa da própria Res. 707/2015.")
nota(ON + "1-2018", "Sem efeito atual: orientava a aplicação do Art. 28 da Res. 582/2010, revogado pela "
     "Res. CFESS nº 1.014/2022 (Art. 47). Não foi localizada revogação expressa da própria orientação.")
nota(ON + "2-2018", "Revogada expressamente pela Res. CFESS nº 1.031/2023 (Art. 14).")
nota(ON + "3-2020", "Vigente. Remete à Res. CFESS nº 493/2006, revogada pela Res. 1.114/2025 (Art. 21); "
     "as condições éticas e técnicas hoje seguem a Res. 1.114/2025.")
nota(ON + "4-2020", "Vigente. Remete à Res. CFESS nº 493/2006, revogada pela Res. 1.114/2025, e menciona a "
     "Res. 559/2009, com efeitos suspensos judicialmente.")
nota(R + "418-2001-p662", "Vigente com a alteração da Res. CFESS nº 467/2005 e retificação do Art. 4º (26/10/2021) "
     "(versão compilada). Os valores atualizados da tabela são divulgados pelo CFESS; os do texto são históricos.")
nota(R + "467-2005", "Vigente; incorporada à versão compilada da Res. 418/2001. Os valores do texto são de 2005.")
nota(R + "383-1999", "Vigente. PDF oficial digitalizado: texto transcrito da imagem e conferido com o exemplar em texto "
     "publicado pelo CFESS (arquivos/resolucao_383_99.pdf).")
nota(R + "443-2003", "Revogada pela Res. CFESS nº 1.073/2024 (Art. 13), que trata hoje do desagravo público.")
nota(R + "493-2006", "Revogada pela Res. CFESS nº 1.114/2025 (Art. 21), que trata hoje das condições éticas e técnicas.")
nota(R + "513-2007", "Revogada pela Res. CFESS nº 556/2009 (Art. 12), por sua vez revogada pela Res. 1.098/2025.")
nota(R + "556-2009", "Revogada pela Res. CFESS nº 1.098/2025 (Art. 18), que trata hoje da salvaguarda de material sigiloso.")
nota(R + "615-2011", "Revogada pela Res. CFESS nº 785/2016 (Art. 7º), que trata hoje do nome social.")
nota(R + "554-2009", "Invalidada por decisão judicial: sentença da 1ª Vara Federal do Ceará (ação "
     "0004766-50.2012.4.05.8100), com trânsito em julgado registrado em 2019, segundo o Parecer Jurídico CFESS nº 55/2020 "
     "e o aviso no próprio PDF do CFESS. Não deve ser aplicada.")
nota(R + "559-2009", "Efeitos suspensos por decisão judicial, conforme aviso no próprio PDF do CFESS (ação na 3ª Vara "
     "Federal de Porto Alegre; agravo 5020239-68.2012.404.0000 no TRF4). Não deve ser aplicada.")

# Res. 383/1999: corroboração da transcrição pelo exemplar em texto do CFESS.
arq = RAIZ / "dados" / "configuracao" / "transcricoes" / f"{R}383-1999.json"
cfg = json.loads(arq.read_text(encoding="utf-8"))
cfg["corroboracao"] = [
    "Comparada automaticamente (28/10/2026) com o exemplar em texto publicado pelo CFESS em "
    "https://www.cfess.org.br/arquivos/resolucao_383_99.pdf: 99,8% das palavras iguais; única diferença, "
    "\"técnico-política\" (com hífen, como na imagem) × \"técnicopolítica\" no exemplar em texto."]
arq.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

# ---- Aprovação -----------------------------------------------------------------
APROVAR = {
    5: {R + "1014-2022": ("alterada", "registro_inscricao", []),
        R + "1018-2023": ("vigente_confirmada", "registro_inscricao", []),
        R + "1068-2024": ("alterada", "registro_inscricao", []),
        R + "1147-2026": ("vigente_confirmada", "registro_inscricao", ["direitos_profissionais"]),
        R + "1015-2022": ("alterada", "registro_inscricao", []),
        R + "1031-2023": ("alterada", "exercicio_profissional", ["registro_inscricao"]),
        R + "1116-2025": ("vigente_confirmada", "exercicio_profissional", []),
        R + "572-2010": ("vigente_confirmada", "registro_inscricao", ["exercicio_profissional"]),
        R + "884-2018": ("alterada", "registro_inscricao", []),
        R + "590-2010": ("vigente_confirmada", "fiscalizacao_profissional", ["exercicio_profissional"]),
        R + "785-2016": ("vigente_confirmada", "registro_inscricao", ["direitos_profissionais"])},
    6: {R + "938-2020": ("vigente_confirmada", "processo_etico", []),
        R + "1013-2022": ("vigente_confirmada", "processo_etico", []),
        R + "988-2022": ("vigente_confirmada", "processo_etico", []),
        R + "548-2009": ("alterada", "processo_etico", []),
        R + "943-2020": ("alterada", "processo_etico", []),
        R + "726-2015": ("alterada", "processo_etico", []),
        R + "555-2009": ("revogada", "registro_inscricao", []),
        R + "560-2009": ("revogada", "registro_inscricao", []),
        R + "861-2018": ("vigente_confirmada", "processo_etico", []),
        R + "923-2019": ("vigente_confirmada", "processo_etico", [])},
    7: {R + "782-2016": ("revogada", "fiscalizacao_profissional", []),
        R + "828-2017": ("vigente_confirmada", "fiscalizacao_profissional", []),
        R + "707-2015": ("revogada", "registro_inscricao", []),
        ON + "1-2018": ("revogada", "registro_inscricao", []),
        ON + "2-2018": ("revogada", "exercicio_profissional", []),
        ON + "3-2020": ("alterada", "condicoes_eticas_tecnicas", []),
        ON + "4-2020": ("vigente_confirmada", "sigilo_profissional", ["documentos_tecnicos"]),
        R + "418-2001-p662": ("alterada", "exercicio_profissional", []),
        R + "467-2005": ("vigente_confirmada", "exercicio_profissional", []),
        R + "845-2018": ("vigente_confirmada", "relacao_usuarios", ["exercicio_profissional"]),
        R + "383-1999": ("vigente_confirmada", "exercicio_profissional", [])},
    8: {R + "443-2003": ("revogada", "direitos_profissionais", []),
        R + "493-2006": ("revogada", "condicoes_eticas_tecnicas", []),
        R + "513-2007": ("revogada", "sigilo_profissional", []),
        R + "556-2009": ("revogada", "sigilo_profissional", []),
        R + "615-2011": ("revogada", "registro_inscricao", []),
        R + "554-2009": ("sem_efeito_judicial", "documentos_tecnicos", ["relacao_usuarios"]),
        R + "559-2009": ("sem_efeito_judicial", "documentos_tecnicos", ["sigilo_profissional"])},
}
NOTAS = {
    R + "1147-2026": " A pergunta a) ficou sem marcação; arquivo e amostras confirmados pelas marcações da tabela.",
    ON + "2-2018": (" DIVERGÊNCIA: o revisor marcou \"Vigente\", mas a Res. CFESS nº 1.031/2023, Art. 14, revoga "
                    "expressamente esta orientação (texto oficial conferido pelo desenvolvimento); registrada como "
                    "revogada (D31), aguardando ciência do revisor."),
    R + "707-2015": " Situação marcada pelo revisor (revogada); fundamento na nota de vigência.",
    ON + "1-2018": " Situação marcada pelo revisor (revogada); fundamento na nota de vigência.",
    R + "383-1999": (" Arquivo e amostras não marcados pelo revisor; o texto transcrito foi conferido automaticamente "
                     "com o exemplar em texto do CFESS (99,8% igual). Situação marcada pelo revisor."),
}
for num, docs in APROVAR.items():
    for id_, (situacao, assunto, secundarios) in docs.items():
        revisao.aprovar(id_, RESP, situacao, assunto, secundarios, OBS[num] + OBS_FIM + NOTAS.get(id_, ""),
                        "link_e_excertos")
        revisao.publicar(id_, RESP)
        print("publicado:", id_)

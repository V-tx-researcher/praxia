"""Registra a Atividade de conferência nº 9 (pendências), respondida em 28/10/2026.

Itens 1 a 3 completam conferências já aprovadas (ON 2/2018, Res. 1.147/2026 e
Res. 383/1999). Item 4 (Código de Ética): o revisor indicou fontes que não são o
texto oficial (LegisWeb e materiais do CFESS); ficam como indício interno (D20).

Uso (na raiz): python scripts/revisao/registrar_atividade9.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from gpecss import catalogo  # noqa: E402

AT9 = " | Atividade nº 9 (28/10/2026): "


def completar(id_, texto):
    r = catalogo.carregar(id_)
    r["conferencia"]["observacoes"] = (r["conferencia"].get("observacoes") or "") + AT9 + texto
    catalogo.salvar(r)


r = catalogo.carregar("cfess-orientacao-normativa-2-2018")
r["conferencia"]["observacoes"] = r["conferencia"]["observacoes"].replace(
    "registrada como revogada (D31), aguardando ciência do revisor.",
    "registrada como revogada (D31).")
catalogo.salvar(r)
completar("cfess-orientacao-normativa-2-2018",
          "o revisor concordou com a revogação pela Res. 1.031/2023, Art. 14; divergência encerrada.")
completar("cfess-resolucao-1147-2026", "pergunta a) respondida: PDF oficial completo.")
completar("cfess-resolucao-383-1999",
          "o revisor confirmou o PDF oficial e os três artigos (Arts. 1º a 3º) iguais à imagem.")

r = catalogo.carregar("cfess-codigo-etica-1993")
for item in r["alteracoes"]["alterado_por"]:
    if item.get("referencia") == "Resolução CFESS nº 290/1994":
        item["descricao"] = ("Citada no próprio Código (p. 43 do PDF) e na Res. 594/2011, Art. 5º. Indício (LegisWeb, "
                             "não oficial): DOU de 11/02/1994; Art. 1º dá ao Art. 25 a redação \"pelo prazo de 30 (trinta) "
                             "dias a 2 (dois) anos\" e Art. 2º corrige a alínea a do Art. 20 (\"mesmo quando autorizado\") — "
                             "redações que já constam do texto publicado. Texto oficial não localizado.")
    elif item.get("referencia") in {"Resolução CFESS nº 293/1994", "Resolução CFESS nº 333/1996"}:
        item["descricao"] += " Atividade nº 9: o revisor indicou apenas menções históricas, sem o texto da resolução."
r["pendencias_conferencia"] = [
    "Res. 290/1994 (Art. 25, caput; Art. 20, alínea a): texto oficial (DOU de 11/02/1994) não localizado; a LegisWeb "
    "reproduz a resolução e as redações coincidem com o Código publicado.",
    "Res. 333/1996 (Art. 25, caput, segundo o revisor) e Res. 293/1994: texto não localizado.",
]
catalogo.salvar(r)
print("Atividade nº 9 registrada")

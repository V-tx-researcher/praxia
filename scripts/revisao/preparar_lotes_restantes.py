"""Prepara os lotes 3 a 6 (todas as normas incluídas que ainda aguardam conferência).

Para cada norma, as "relações já conhecidas" são as ementas de outras normas do
portal que a citam com verbo de alteração (altera, complementa, revoga…) e as
indicações de situação do próprio portal — apoio à conferência, não resposta.

Uso (na raiz): python scripts/revisao/preparar_lotes_restantes.py
Depois: node scripts/revisao/atividade_lote.js dados/configuracao/lotes/lote-NN.json <saida.docx> <nº>
"""

import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402

LOTES = {
    3: ("Inscrição, registro e exercício profissional", [
        "cfess-resolucao-1014-2022", "cfess-resolucao-1018-2023", "cfess-resolucao-1068-2024",
        "cfess-resolucao-1147-2026", "cfess-resolucao-1015-2022", "cfess-resolucao-1031-2023",
        "cfess-resolucao-1116-2025", "cfess-resolucao-572-2010", "cfess-resolucao-884-2018",
        "cfess-resolucao-590-2010", "cfess-resolucao-785-2016"]),
    4: ("Processo ético e disciplinar", [
        "cfess-resolucao-938-2020", "cfess-resolucao-1013-2022", "cfess-resolucao-988-2022",
        "cfess-resolucao-548-2009", "cfess-resolucao-943-2020", "cfess-resolucao-726-2015",
        "cfess-resolucao-555-2009", "cfess-resolucao-560-2009", "cfess-resolucao-861-2018",
        "cfess-resolucao-923-2019"]),
    5: ("Fiscalização, orientações normativas e outros temas", [
        "cfess-resolucao-782-2016", "cfess-resolucao-828-2017", "cfess-resolucao-707-2015",
        "cfess-orientacao-normativa-1-2018", "cfess-orientacao-normativa-2-2018",
        "cfess-orientacao-normativa-3-2020", "cfess-orientacao-normativa-4-2020",
        "cfess-resolucao-418-2001-p662", "cfess-resolucao-467-2005", "cfess-resolucao-845-2018",
        "cfess-resolucao-383-1999"]),
    6: ("Normas históricas (revogadas, suspensas ou invalidadas)", [
        "cfess-resolucao-443-2003", "cfess-resolucao-493-2006", "cfess-resolucao-513-2007",
        "cfess-resolucao-556-2009", "cfess-resolucao-615-2011", "cfess-resolucao-554-2009",
        "cfess-resolucao-559-2009"]),
}

AVISOS = {
    "cfess-resolucao-383-1999": (
        "Este PDF é uma imagem digitalizada (sem texto). O texto usado pelo sistema foi TRANSCRITO da imagem pelo "
        "desenvolvimento. Por isso, na tabela b), confira com atenção se os trechos estão iguais ao PDF, palavra por palavra."),
    "cfess-resolucao-418-2001-p662": "Versão compilada da Tabela Referencial de Honorários (inclui a alteração da Res. 467/2005).",
    "cfess-resolucao-548-2009": "Verifique se o PDF é a versão compilada (com as alterações das Res. 943/2020 e 1.103/2025) ou o texto original.",
}
HISTORICA = ("Norma histórica: entra no acervo para consulta de fatos antigos, com aviso de que não está em vigor. "
             "Confirme por qual norma ou decisão ela deixou de valer.")

# Indicações do portal que a coleta guardou truncadas no ponto do milhar
# ("Resolução CFESS nº 1"); completadas com o texto oficial já conferido.
CONHECIDAS = {
    "cfess-resolucao-443-2003": ["Revogada pela Res. CFESS nº 1.073/2024 (Art. 13 — conferido no lote 2)."],
    "cfess-resolucao-493-2006": ["Revogada integralmente pela Res. CFESS nº 1.114/2025 (Art. 21 — conferido no lote 1)."],
    "cfess-resolucao-556-2009": ["Revogada integralmente pela Res. CFESS nº 1.098/2025 (Art. 18 — conferido no lote 1)."],
}

VERBO = re.compile(r"\b(altera|complementa|revoga|acrescenta|inclui|substitui|anula|suspende|regulamenta)", re.I)


def numero_ano(id_: str) -> tuple[str, str] | None:
    m = re.match(r"cfess-(?:resolucao|orientacao-normativa)-(\d+)-(\d{4})", id_)
    return (m.group(1), m.group(2)) if m else None


def relacoes(id_: str, todos: list[dict]) -> list[str]:
    na = numero_ano(id_)
    if not na or "orientacao" in id_:
        return []
    n, ano = na
    variantes = {n, f"{int(n):,}".replace(",", ".")}
    alvo = re.compile(r"(?<![\d.])(" + "|".join(re.escape(v) for v in variantes) + r")(?![\d])")
    saida = []
    for r in todos:
        if r["id"] == id_ or r["id"].startswith(id_ + "-p") or r["tipo_documental"] == "portaria":
            continue
        ementa = re.sub(r"\s+", " ", r.get("ementa") or "")
        if ementa and VERBO.search(ementa) and alvo.search(ementa) and ("Resolu" in ementa or ano in ementa):
            saida.append(f"{r['titulo_oficial']} (portal): {ementa[:220]}")
    return saida[:6]


def main():
    todos = catalogo.todos()
    for num, (tema, ids) in LOTES.items():
        subprocess.run([sys.executable, str(RAIZ / "scripts/revisao/preparar_lote.py"), str(num), *ids], check=True)
        arq = RAIZ / "dados" / "configuracao" / "lotes" / f"lote-{num:02d}.json"
        d = json.loads(arq.read_text(encoding="utf-8"))
        d["tema"] = tema
        for x in d["documentos"]:
            x["relacoes_conhecidas"] = CONHECIDAS.get(x["id"], []) + relacoes(x["id"], todos)
            x["indicacoes_portal"] = [i for i in x["indicacoes_portal"] if not re.search(r"nº 1$", i)]
            aviso = AVISOS.get(x["id"]) or (HISTORICA if num == 6 else None)
            if aviso:
                x["aviso"] = aviso
        arq.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"lote {num}: {len(d['documentos'])} normas — {tema}")


if __name__ == "__main__":
    main()

"""Monta a pasta de fontes da Atividade nº 10 para o NotebookLM.

Copia os PDFs oficiais já baixados pelo pipeline (normas usadas nas respostas e os 28
documentos da camada 2), com nomes legíveis. Não baixa nada de novo.

Uso: python scripts/revisao/montar_fontes_notebooklm.py [pasta-destino]
"""

import json
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DESTINO = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "docs" / "revisao" / "Fontes_NotebookLM_Atividade_10"

NORMAS = [
    ("cfess-codigo-etica-1993", "Codigo de Etica e Lei 8662-1993"),
    ("cfess-orientacao-normativa-3-2020", "Orientacao Normativa 3-2020"),
    ("cfess-orientacao-normativa-4-2020", "Orientacao Normativa 4-2020"),
    ("cfess-resolucao-1098-2025", "Resolucao 1098-2025"),
    ("cfess-resolucao-1114-2025", "Resolucao 1114-2025"),
    ("cfess-resolucao-557-2009", "Resolucao 557-2009"),
    ("cfess-resolucao-1031-2023", "Resolucao 1031-2023 compilada"),
    ("cfess-resolucao-418-2001-p662", "Resolucao 418-2001 compilada"),
    ("cfess-resolucao-590-2010", "Resolucao 590-2010"),
    ("cfess-resolucao-533-2008", "Resolucao 533-2008"),
    ("cfess-resolucao-493-2006", "Resolucao 493-2006 REVOGADA"),
    ("cfess-resolucao-660-2013", "Resolucao 660-2013 compilada"),
    ("cfess-resolucao-548-2009", "Resolucao 548-2009 compilada"),
    ("cfess-resolucao-1014-2022", "Resolucao 1014-2022 compilada"),
    ("cfess-resolucao-1068-2024", "Resolucao 1068-2024"),
]


def main() -> int:
    (DESTINO / "1 Normas").mkdir(parents=True, exist_ok=True)
    (DESTINO / "2 Orientacoes institucionais").mkdir(parents=True, exist_ok=True)
    faltando = []
    for doc_id, nome in NORMAS:
        reg = json.loads((RAIZ / "dados" / "catalogo" / f"{doc_id}.json").read_text(encoding="utf-8"))
        arq = next((a for a in reg["arquivos"] if a["papel"] == "principal"), None)
        origem = RAIZ / arq["caminho_local"] if arq else None
        if origem and origem.exists():
            shutil.copy2(origem, DESTINO / "1 Normas" / f"{nome}.pdf")
        else:
            faltando.append(doc_id)
    cfg = json.loads((RAIZ / "dados" / "configuracao" / "camada2.json").read_text(encoding="utf-8"))
    for n, d in enumerate(cfg["documentos"], start=1):
        origem = RAIZ / "dados" / "brutos" / "camada2" / f"{d['id']}.pdf"
        if origem.exists():
            shutil.copy2(origem, DESTINO / "2 Orientacoes institucionais" / f"{n:02d} {d['id']}.pdf")
        else:
            faltando.append(d["id"])
    total = sum(1 for p in DESTINO.rglob("*.pdf"))
    tamanho = sum(p.stat().st_size for p in DESTINO.rglob("*.pdf")) / 1024 / 1024
    print(f"{total} PDFs em {DESTINO} ({tamanho:.0f} MB)")
    if faltando:
        print("faltando:", ", ".join(faltando))
    return 0


if __name__ == "__main__":
    sys.exit(main())

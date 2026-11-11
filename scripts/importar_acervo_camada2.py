"""D52: importa para a camada 2 (orientações institucionais) os documentos técnicos do acervo
CFESS-CRESS-ABEPSS baixado em Desktop\\Acervo_CFESS (notas técnicas, pareceres, subsídios e
parâmetros, documentos de formação). Entram como NÃO conferidos: só aparecem na prévia local até
a conferência humana (D27). Uso:

    py scripts/importar_acervo_camada2.py <pasta Acervo_CFESS_CRESS_ABEPSS> [--limite N]
"""
import argparse
import csv
import hashlib
import json
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import interpretacao  # noqa: E402
from gpecss.esquema import agora_iso  # noqa: E402

TIPOS = {
    "Nota técnica": "nota_tecnica",
    "Parecer jurídico": "parecer_juridico",
    "Parecer técnico": "parecer_tecnico",
    "Manifestação técnica": "parecer_tecnico",
    "Orientação técnica": "parecer_tecnico",
    "Subsídios e parâmetros": "documento_orientativo",
    "Documento de formação": "politica_institucional",
    "Diretriz curricular": "politica_institucional",
    "Política de formação": "politica_institucional",
    "Política institucional": "politica_institucional",
    # D53: literatura ampliada (modo Trilhas)
    "Livro": "livro",
    "Caderno": "formacao",
    "Cartilha": "cartilha",
    "Peça educativa": "cartilha",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("acervo", type=Path)
    ap.add_argument("--limite", type=int, default=0)
    a = ap.parse_args()
    cfg = interpretacao.carregar_config()
    vistos = {d.get("sha256") for d in cfg["documentos"]}
    ids = {d["id"] for d in cfg["documentos"]}
    interpretacao.DIR_BRUTOS.mkdir(parents=True, exist_ok=True)
    novos = []
    with open(a.acervo / "relatorio_downloads.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            tipo = TIPOS.get(r["Tipo / seção"])
            arq = r["Arquivo relativo"]
            if not tipo or not arq.lower().endswith(".pdf") or r["Aba original"] != "Inventário":
                continue
            if not r["SHA-256"] or r["SHA-256"] in vistos:
                continue
            id_ = f"acervo-{r['ID'].lower()}"
            if id_ in ids:
                continue
            origem = a.acervo / arq
            if not origem.exists():
                continue
            vistos.add(r["SHA-256"])
            shutil.copy2(origem, interpretacao.DIR_BRUTOS / f"{id_}.pdf")
            ano = r["Ano"][:4]
            orgao = r["Acervo / coleção"]
            url = r["URL final"] or r["URL localizada"] or r["URL do item"]
            novos.append({
                "id": id_, "orgao": orgao, "tipo": tipo, "ano": int(ano) if ano.isdigit() else None,
                "titulo": r["Título"].strip(), "url": url,
                "fonte_oficial_url": r["URL do item"] or r["URL da fonte"] or url,
                "assuntos": [], "sha256": r["SHA-256"], "data_coleta": agora_iso(),
                "bytes": int(r["Bytes"] or 0), "alertas": [], "conferido": False,
                "origem_acervo": {"id_inventario": r["ID"], "tipo_inventario": r["Tipo / seção"]},
            })
            if a.limite and len(novos) >= a.limite:
                break
    cfg["documentos"].extend(novos)
    interpretacao.salvar_config(cfg)
    print(f"{len(novos)} documento(s) acrescentado(s) à camada 2 (não conferidos)")
    print(" ".join(d["id"] for d in novos))


if __name__ == "__main__":
    main()

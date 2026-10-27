"""Prepara os dados de uma atividade de conferência em lote.

Uso (na raiz): python scripts/revisao/preparar_lote.py <nº do lote> <id> [<id> ...]
Saída: dados/configuracao/lotes/lote-NN.json (consumido por atividade_lote.js).
"""

import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402

DISPOSITIVOS = {"artigo", "paragrafo", "inciso", "alinea", "principio"}


def amostras(texto: dict, n: int = 3) -> list[dict]:
    unidades = [u for u in texto["unidades"] if u["tipo"] in DISPOSITIVOS] or texto["unidades"]
    posicoes = sorted({0, len(unidades) // 2, max(0, int(len(unidades) * 0.85))})[:n]
    return [{"rotulo": unidades[i]["rotulo"], "pagina": unidades[i]["pagina_inicio"],
             "texto": unidades[i]["texto"][:420] + ("…" if len(unidades[i]["texto"]) > 420 else "")} for i in posicoes]


def main():
    numero = int(sys.argv[1])
    docs = []
    for id_ in sys.argv[2:]:
        r = catalogo.carregar(id_)
        t = catalogo.carregar_texto(id_, r["versao_atual"])
        principal = next(a for a in r["arquivos"] if a["papel"] == "principal")
        indicacoes = [a.split(":", 1)[1] for a in r["alertas"] if a.startswith("portal_indica_situacao:")]
        mencoes = [m for m in r["alteracoes"].get("mencoes_detectadas", [])
                   if set(m["relacoes"]) & {"possivel_alteracao", "possivel_revogacao"}][:6]
        outros_alertas = [a for a in r["alertas"] if not a.startswith(("portal_indica_situacao:",))]
        docs.append({
            "id": id_,
            "titulo": r["titulo_oficial"],
            "ementa": re.sub(r"\s+", " ", r.get("ementa") or "")[:400],
            "pagina_oficial": r["fonte_oficial_url"],
            "pdf": principal["url"],
            "paginas_pdf": len(t["paginas"]),
            "dispositivos": sum(1 for u in t["unidades"] if u["tipo"] in DISPOSITIVOS),
            "indicacoes_portal": indicacoes,
            "mencoes": [f"{m['texto']} ({', '.join(x.replace('possivel_', 'possível ') for x in m['relacoes'] if x != 'mencao')})" for m in mencoes],
            "alertas": outros_alertas,
            "lacunas": r.get("lacunas_detectadas", []),
            "transcricoes": r.get("transcricoes_conferidas", []),
            "amostras": amostras(t),
        })
    destino = RAIZ / "dados" / "configuracao" / "lotes" / f"lote-{numero:02d}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps({"lote": numero, "documentos": docs}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(destino, len(docs), "documentos")


if __name__ == "__main__":
    main()

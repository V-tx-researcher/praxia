"""Monta a pasta `publicar/` com o que pode ir para a hospedagem estática.

Exclui páginas internas (app/dev), o índice de prévia (documentos não conferidos)
e qualquer arquivo de dados que não seja o índice público. Falha se o índice
público contiver documento não conferido.

Uso: python scripts/preparar_publicacao.py
"""

import json
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ORIGEM = RAIZ / "app"
DESTINO = RAIZ / "publicar"
EXCLUIR = {"dev", "acervo-previa.json"}


def main() -> int:
    indice = json.loads((ORIGEM / "dados" / "acervo-publico.json").read_text(encoding="utf-8"))
    if indice.get("modo") != "publico":
        print("ERRO: app/dados/acervo-publico.json não é um índice público")
        return 1
    nao_conferidos = [d["id"] for d in indice["documentos"] if not d.get("conferido")]
    if nao_conferidos:
        print("ERRO: documentos não conferidos no índice público:", ", ".join(nao_conferidos))
        return 1
    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    shutil.copytree(ORIGEM, DESTINO, ignore=lambda d, nomes: [n for n in nomes if n in EXCLUIR])
    shutil.copy(RAIZ / "scripts" / "_headers", DESTINO / "_headers")
    total = sum(1 for p in DESTINO.rglob("*") if p.is_file())
    maior = max(p.stat().st_size for p in DESTINO.rglob("*") if p.is_file())
    print(f"publicar/: {total} arquivos; maior arquivo {maior / 1024:.0f} KiB "
          f"(limite do Cloudflare Pages: 25 MiB por arquivo, 20.000 arquivos)")
    print(f"índice público: {len(indice['documentos'])} documentos, {len(indice['unidades'])} unidades")
    return 0


if __name__ == "__main__":
    sys.exit(main())

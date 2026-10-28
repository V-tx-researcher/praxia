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
EXCLUIR = {"dev", "acervo-previa.json", "semantica-previa.json", "interpretacao-previa.json"}


def main() -> int:
    indice = json.loads((ORIGEM / "dados" / "acervo-publico.json").read_text(encoding="utf-8"))
    if indice.get("modo") != "publico":
        print("ERRO: app/dados/acervo-publico.json não é um índice público")
        return 1
    nao_conferidos = [d["id"] for d in indice["documentos"] if not d.get("conferido")]
    if nao_conferidos:
        print("ERRO: documentos não conferidos no índice público:", ", ".join(nao_conferidos))
        return 1
    # Vetores da busca por sentido precisam ser da mesma versão do índice (D36);
    # se estiverem desatualizados, o app os ignoraria: melhor não publicar.
    excluir = set(EXCLUIR)
    sem = ORIGEM / "dados" / "semantica-publico.json"
    if sem.exists():
        dados_sem = json.loads(sem.read_text(encoding="utf-8"))
        if dados_sem.get("acervo_gerado_em") != indice.get("gerado_em"):
            print("AVISO: vetores de sentido desatualizados; não serão publicados "
                  "(regenere com scripts/semantica/gerar_vetores.mjs publico)")
            excluir.add("semantica-publico.json")
    # Tudo o que o service worker guarda precisa existir, senão a instalação offline falha.
    import re
    sw = (ORIGEM / "sw.js").read_text(encoding="utf-8")
    faltando = [f for f in re.findall(r'"([\w./-]+\.(?:js|css|png|svg|json|webmanifest|html))"', sw)
                if not (ORIGEM / f.lstrip("/")).exists()]
    if faltando:
        print("ERRO: arquivos listados no service worker e inexistentes:", ", ".join(faltando))
        return 1
    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    shutil.copytree(ORIGEM, DESTINO, ignore=lambda d, nomes: [n for n in nomes if n in excluir])
    shutil.copy(RAIZ / "scripts" / "_headers", DESTINO / "_headers")
    total = sum(1 for p in DESTINO.rglob("*") if p.is_file())
    maior = max(p.stat().st_size for p in DESTINO.rglob("*") if p.is_file())
    print(f"publicar/: {total} arquivos; maior arquivo {maior / 1024:.0f} KiB "
          f"(limite do Cloudflare Pages: 25 MiB por arquivo, 20.000 arquivos)")
    print(f"índice público: {len(indice['documentos'])} documentos, {len(indice['unidades'])} unidades")
    return 0


if __name__ == "__main__":
    sys.exit(main())

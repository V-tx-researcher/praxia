"""Confere se os links de texto integral da literatura (camada 3) abrem.

Lê os CSVs em docs/revisao/literatura_bloco_*.csv, faz uma requisição GET a cada link
(lendo só o começo da resposta) e grava o resultado em dados/literatura/links.json.
Depois, rode consolidar.py para levar o resultado ao app.

"Abre" = resposta HTTP 2xx com conteúdo HTML ou PDF. Não confere o conteúdo do texto.

Uso: python scripts/literatura/conferir_links.py
"""

import csv
import http.cookiejar
import json
import ssl
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from consolidar import SUBSTITUI_LINK  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
ENTRADA = RAIZ / "docs" / "revisao"
SAIDA = RAIZ / "dados" / "literatura" / "links.json"
AGENTE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GPECSS-Consulta/0.5 (conferencia de links)"


def links():
    vistos = []
    for arq in sorted(ENTRADA.glob("literatura_bloco_*.csv")):
        with arq.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f, delimiter=";"):
                u = (r.get("link_texto_integral") or "").strip()
                u = SUBSTITUI_LINK.get(u, u)
                if u and u not in vistos:
                    vistos.append(u)
    return vistos


def conferir(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept": "text/html,application/pdf,*/*"})
    for contexto in (None, ssl._create_unverified_context()):  # alguns portais públicos têm cadeia TLS incompleta
        try:
            # Periódicos em OJS redirecionam até receber o cookie de sessão: um "jar" por link.
            abridor = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
                                                  urllib.request.HTTPSHandler(context=contexto))
            with abridor.open(req, timeout=40) as r:
                inicio = r.read(2048)
                tipo = r.headers.get("Content-Type", "")
                ok = 200 <= r.status < 300 and (
                    "html" in tipo or "pdf" in tipo or inicio.startswith(b"%PDF") or b"<html" in inicio.lower())
                return {"ok": ok, "status": r.status, "tipo": tipo.split(";")[0],
                        "tls_incompleto": contexto is not None, "final": r.geturl()}
        except ssl.SSLError:
            continue
        except urllib.error.URLError as e:
            if isinstance(getattr(e, "reason", None), ssl.SSLError):
                continue
            return {"ok": False, "status": getattr(e, "code", None), "erro": str(e)[:200]}
        except Exception as e:  # noqa: BLE001 - registrar qualquer falha de rede
            return {"ok": False, "status": None, "erro": str(e)[:200]}
    return {"ok": False, "status": None, "erro": "falha de TLS"}


def main() -> int:
    lista = links()
    hoje = date.today().isoformat()
    with ThreadPoolExecutor(max_workers=8) as ex:
        resultados = dict(zip(lista, ex.map(conferir, lista)))
    for r in resultados.values():
        r["em"] = hoje
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(resultados, ensure_ascii=False, indent=1), encoding="utf-8")
    falhos = {u: r for u, r in resultados.items() if not r["ok"]}
    print(f"{len(lista)} links; {len(lista) - len(falhos)} abriram; {len(falhos)} falharam")
    for u, r in falhos.items():
        print(" -", r.get("status"), r.get("tipo") or r.get("erro"), u)
    return 0


if __name__ == "__main__":
    sys.exit(main())

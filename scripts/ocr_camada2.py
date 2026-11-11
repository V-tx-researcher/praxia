"""D57: aplica OCR (leitor nativo do Windows, pt-BR) aos documentos da camada 2 marcados como
`requer_ocr`. Cada página vira imagem (200 dpi), o Windows reconhece as linhas e o texto é gravado
como camada invisível numa cópia do PDF, que substitui o arquivo em dados/brutos/camada2. O SHA-256
registrado passa a ser o da cópia com texto, e o documento ganha o alerta `texto_por_ocr` (a
conferência deve olhar com atenção: OCR erra letras e acentos). Uso:

    py scripts/ocr_camada2.py [ids...]
"""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import fitz

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import interpretacao  # noqa: E402

DPI = 200
PS1 = RAIZ / "scripts" / "ocr_windows.ps1"


def ocr_pdf(origem: Path, destino: Path) -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        with fitz.open(origem) as doc:
            for i, pg in enumerate(doc):
                pg.get_pixmap(dpi=DPI).save(tmp / f"p{i:04d}.png")
            subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(PS1), str(tmp)],
                           check=True)
            escala = 72 / DPI
            linhas_total = 0
            for i, pg in enumerate(doc):
                arq = tmp / f"p{i:04d}.json"
                linhas = json.loads(arq.read_text(encoding="utf-8-sig") or "[]") if arq.exists() else []
                for l in linhas or []:
                    if not l or not l.get("texto"):
                        continue
                    tam = max(4, (l.get("h") or 12) * escala * 0.8)
                    pg.insert_text((l["x"] * escala, (l["y"] + (l.get("h") or 12)) * escala), l["texto"],
                                   fontsize=tam, render_mode=3)
                    linhas_total += 1
            doc.save(destino, garbage=3, deflate=True)
    return linhas_total


def main() -> None:
    ids = set(sys.argv[1:])
    cfg = interpretacao.carregar_config()
    feitos = []
    for d in cfg["documentos"]:
        if ids and d["id"] not in ids:
            continue
        if not ids and "requer_ocr" not in d.get("alertas", []):
            continue
        bruto = interpretacao.DIR_BRUTOS / f"{d['id']}.pdf"
        if not bruto.exists():
            continue
        destino = bruto.with_suffix(".ocr.pdf")
        n = ocr_pdf(bruto, destino)
        if n < 5:
            destino.unlink(missing_ok=True)
            print(f"  {d['id']}: OCR sem texto útil ({n} linhas)")
            continue
        shutil.move(destino, bruto)
        d["sha256"] = hashlib.sha256(bruto.read_bytes()).hexdigest()
        d["alertas"] = [a for a in d.get("alertas", []) if a != "requer_ocr"] + ["texto_por_ocr"]
        feitos.append(d["id"])
        print(f"  {d['id']}: {n} linhas reconhecidas")
        interpretacao.salvar_config(cfg)
    print(" ".join(feitos))


if __name__ == "__main__":
    main()

"""Mostra o conteúdo de uma atividade .docx respondida, com tabelas linha a linha.

Uso: python scripts/revisao/ler_atividade.py docs/revisao/Atividade_03_Lote_01.docx
"""

import re
import sys
import zipfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def paragrafos(fragmento: str) -> list[str]:
    saida = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", fragmento, re.S):
        partes = []
        for m in re.finditer(r'<w:t[^>]*>([^<]*)</w:t>|<w:sym [^>]*w:char="([0-9A-Fa-f]+)"', p):
            partes.append(m.group(1) if m.group(1) is not None else chr(int(m.group(2), 16)))
        saida.append("".join(partes))
    return saida


def main(caminho: str) -> None:
    xml = zipfile.ZipFile(caminho).read("word/document.xml").decode("utf-8")
    corpo = re.search(r"<w:body>(.*)</w:body>", xml, re.S).group(1)
    for m in re.finditer(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", corpo, re.S):
        bloco = m.group(0)
        if bloco.startswith("<w:tbl>"):
            for linha in re.findall(r"<w:tr[ >].*?</w:tr>", bloco, re.S):
                celulas = [" / ".join(s for s in paragrafos(c) if s.strip()) for c in re.findall(r"<w:tc>.*?</w:tc>", linha, re.S)]
                print("   | " + " | ".join(celulas))
        else:
            texto = "".join(paragrafos(bloco))
            if texto.strip():
                print(texto)


if __name__ == "__main__":
    main(sys.argv[1])

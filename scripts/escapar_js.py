"""Troca caracteres invisíveis/combinantes/aspas tipográficas em fontes JS por escapes \\uXXXX."""
import sys
import unicodedata

BS = chr(92)
ALVOS = set(range(0x0300, 0x0370)) | {0x201C, 0x201D, 0x2018, 0x2019, 0x00A0, 0xFEFF, 0x200B, 0xFFFE, 0x00AD, 0x00AB, 0x00BB}

for caminho in sys.argv[1:]:
    s = open(caminho, encoding="utf-8").read()
    saida = []
    for c in s:
        cp = ord(c)
        if cp in ALVOS or unicodedata.category(c) in {"Mn", "Cf", "Zs"} and c != " ":
            saida.append(f"{BS}u{cp:04x}")
        else:
            saida.append(c)
    novo = "".join(saida)
    if novo != s:
        open(caminho, "w", encoding="utf-8", newline="\n").write(novo)
        print("corrigido:", caminho)

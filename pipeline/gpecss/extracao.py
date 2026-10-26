"""Extração de texto por página, com avaliação de qualidade.

O texto de cada página é preservado como fonte canônica das citações.
A única normalização aplicada é de espaços em branco (ver `normalizar_pagina`),
para que qualquer trecho exibido possa ser localizado por deslocamento
(página, início, fim) no texto armazenado.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

NORMALIZACAO = ("NFC; quebras de linha unificadas em \n; NBSP->espaço; caracteres de controle removidos; "
                "hífen de fim de linha do pdfium (U+FFFE) e hífen brando (U+00AD) -> '-'; "
                "espaços nas extremidades de cada linha removidos")

_CONTROLE = re.compile("[" + "".join(map(chr, [*range(0x00, 0x09), 0x0B, 0x0C, *range(0x0E, 0x20), 0x7F, 0xFEFF, 0x200B])) + "]")

# Padrões que sugerem instruções dirigidas a um modelo de linguagem inseridas
# no documento (injeção de prompt). Geram alerta para a conferência humana.
_PADROES_INJECAO = [
    r"ignore (as|todas as) (instru[çc][õo]es|regras)", r"desconsidere (as|todas as) instru",
    r"ignore (all|previous|prior) (instructions|rules)", r"voc[êe] [ée] (um|uma) (assistente|modelo|ia)",
    r"you are (now )?(a|an) (assistant|ai|language model)", r"system prompt", r"prompt do sistema",
    r"responda (sempre|apenas) que", r"<\s*/?\s*(system|assistant|instru[cç][aã]o)\s*>",
    r"\[\s*(inst|system)\s*\]", r"aja como", r"act as",
]
_RE_INJECAO = re.compile("|".join(_PADROES_INJECAO), re.I)


def normalizar_pagina(texto: str) -> str:
    t = unicodedata.normalize("NFC", texto)
    t = t.replace("\r\n", "\n").replace("\r", "\n").replace(chr(0xA0), " ")
    t = _CONTROLE.sub("", t)
    # pdfium devolve U+FFFE no ponto em que a linha impressa foi quebrada com hífen
    # ("fazê-" / "lo"): restauramos o hífen e a quebra de linha; a junção é decidida em
    # estrutura.juntar_linhas. O hífen brando (U+00AD) segue a mesma regra no fim da linha.
    t = re.sub("[ \t]*" + chr(0xFFFE) + "[ \t]*\n?", "-\n", t)
    t = re.sub(chr(0x00AD) + "[ \t]*\n", "-\n", t).replace(chr(0x00AD), "")
    return "\n".join(linha.strip() for linha in t.split("\n")).strip("\n")


def extrair_pdf(caminho: Path) -> list[str]:
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(caminho))
    try:
        paginas = []
        for i in range(len(doc)):
            pagina = doc[i]
            tp = pagina.get_textpage()
            paginas.append(normalizar_pagina(tp.get_text_range()))
            tp.close()
            pagina.close()
        return paginas
    finally:
        doc.close()


def extrair_html_planalto(conteudo: bytes) -> list[str]:
    """Extrai o texto compilado de uma lei do portal do Planalto.

    Trechos riscados (<strike>/<s>/<del>) correspondem a redações revogadas
    ou alteradas e são removidos do texto vigente, mas contabilizados.
    O resultado é tratado como uma única "página".
    """
    from bs4 import BeautifulSoup

    s = BeautifulSoup(conteudo, "lxml")
    for tag in s(["script", "style"]):
        tag.decompose()
    for tag in s(["strike", "s", "del"]):
        tag.decompose()
    blocos = [p.get_text(" ", strip=True) for p in s.find_all(["p", "h1", "h2", "h3", "h4"])]
    blocos = [re.sub(r"\s+", " ", b) for b in blocos if b and b.strip()]
    return [normalizar_pagina("\n".join(blocos))]


def avaliar_qualidade(paginas: list[str]) -> dict:
    n = len(paginas)
    if n == 0:
        return {"classificacao": "falhou", "paginas": 0, "motivo": "nenhuma página"}
    tamanhos = [len(p) for p in paginas]
    vazias = sum(1 for t in tamanhos if t < 20)
    total = sum(tamanhos)
    texto = "".join(paginas)
    letras = sum(1 for c in texto if c.isalpha())
    substituicao = texto.count("�")
    prop_letras = letras / total if total else 0.0
    media = total / n
    info = {
        "paginas": n, "paginas_sem_texto": vazias, "caracteres": total,
        "media_caracteres_pagina": round(media, 1), "proporcao_letras": round(prop_letras, 3),
        "caracteres_substituicao": substituicao,
    }
    if media < 80 or vazias / n > 0.6:
        info["classificacao"] = "requer_ocr"
        info["motivo"] = "pouco texto extraível: provável documento digitalizado"
    elif substituicao > 0.002 * total or prop_letras < 0.55 or vazias / n > 0.25:
        info["classificacao"] = "parcial"
        info["motivo"] = "páginas sem texto ou caracteres corrompidos"
    else:
        info["classificacao"] = "boa"
    return info


def detectar_injecao(paginas: list[str]) -> list[dict]:
    achados = []
    for i, p in enumerate(paginas, start=1):
        for m in _RE_INJECAO.finditer(p):
            achados.append({"pagina": i, "trecho": p[max(0, m.start() - 40): m.end() + 40]})
    return achados

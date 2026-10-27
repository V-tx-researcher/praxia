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


def _linhas_horizontais(pagina) -> list[tuple[float, float, float]]:
    """Traços finos e horizontais desenhados na página: (x0, x1, y)."""
    import pypdfium2.raw as raw

    linhas = []
    for obj in pagina.get_objects(max_depth=5):
        if obj.type == raw.FPDF_PAGEOBJ_PATH:
            x0, y0, x1, y1 = obj.get_bounds()
            if (y1 - y0) < 2.5 and (x1 - x0) > 3:
                linhas.append((x0, x1, (y0 + y1) / 2))
    return linhas


def _indices_riscados(tp, linhas, n: int) -> set[int]:
    """Caracteres atravessados por um traço na faixa central da altura (tachado).

    Traços na base da letra (sublinhado de links) não contam.
    """
    riscados = set()
    if not linhas:
        return riscados
    for i in range(n):
        x0, y0, x1, y1 = tp.get_charbox(i)
        altura = y1 - y0
        if altura <= 0.5 or (x1 - x0) <= 0:
            continue
        cx = (x0 + x1) / 2
        for lx0, lx1, ly in linhas:
            if lx0 <= cx <= lx1 and y0 + 0.25 * altura <= ly <= y0 + 0.8 * altura:
                riscados.add(i)
                break
    return riscados


def _sequencias(indices: list[int]):
    """Agrupa índices consecutivos em intervalos (início, fim)."""
    ini = ant = None
    for i in indices:
        if ini is None:
            ini = ant = i
        elif i == ant + 1:
            ant = i
        else:
            yield ini, ant
            ini = ant = i
    if ini is not None:
        yield ini, ant


def extrair_pdf(caminho: Path, riscados_saida: list | None = None) -> list[str]:
    """Texto por página. Texto tachado (redação revogada em versões compiladas)
    é retirado do texto canônico; se `riscados_saida` for uma lista, recebe o
    texto removido de cada página, para registro e conferência."""
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(caminho))
    try:
        paginas = []
        for i in range(len(doc)):
            pagina = doc[i]
            tp = pagina.get_textpage()
            bruto = tp.get_text_range()
            n = tp.count_chars()
            removido = ""
            if n == len(bruto):
                riscados = _indices_riscados(tp, _linhas_horizontais(pagina), n)
                # Espaços entre caracteres riscados também pertencem ao trecho riscado.
                # Espaços e pontuação baixa (vírgula, ponto), que o traço não cruza, entre
                # caracteres riscados pertencem ao mesmo trecho.
                for _ in range(2):
                    riscados |= {j for j in range(1, n - 1)
                                 if bruto[j] in " ,.;:" and j not in riscados
                                 and (j - 1 in riscados) and (j + 1 in riscados or (j + 2 < n and j + 2 in riscados))}
                # Sequências muito curtas (ex.: um ":" cortado por borda de tabela) não são tachado.
                for ini, fim in _sequencias(sorted(riscados)):
                    if sum(1 for j in range(ini, fim + 1) if not bruto[j].isspace()) < 3:
                        riscados -= set(range(ini, fim + 1))
                if riscados:
                    # Mantém quebras de linha para não colar parágrafos vizinhos.
                    removido = "".join(c for j, c in enumerate(bruto) if j in riscados and c not in "\r\n")
                    bruto = "".join(c for j, c in enumerate(bruto) if j not in riscados or c in "\r\n")
            if riscados_saida is not None:
                riscados_saida.append(re.sub(r"\s+", " ", removido).strip())
            paginas.append(normalizar_pagina(bruto))
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


_RE_ASPAS_VAZIAS = re.compile("[“\"]\\s*[”\"]")


def detectar_lacunas(paginas: list[str]) -> list[dict]:
    """Linhas com indício de texto perdido na extração (fontes sem mapa de caracteres).

    Sinais: aspas vazias (“ ”) ou letras isoladas que não são palavras do português
    (ex.: "I - “ ” 22 ú 25 o 273/1993."). Não corrige nada: gera alerta para a
    conferência e indica necessidade de OCR ou leitura direta do PDF.
    """
    achados = []
    for n, texto in enumerate(paginas, start=1):
        for linha in texto.split("\n"):
            limpa = re.sub(r"/[ao]s?\b", "", linha)          # marcas de gênero: o/a, os/as
            limpa = re.sub(r"(?:\b[^\W\d_] ){3,}[^\W\d_]\b", "", limpa)  # títulos espaçados: "R E S O L U Ç Ã O"
            isoladas = [p for p in re.findall(r"(?<![\w/.])[^\W\d_](?![\w/.])", limpa)
                        if p.lower() not in _LETRAS_PALAVRA]
            if _RE_ASPAS_VAZIAS.search(linha) or len(isoladas) >= 2:
                achados.append({"pagina": n, "linha": linha[:160]})
    return achados


# Letras que são palavras em português (artigos, conjunções, preposição craseada)
# ou rótulos usuais de alíneas e incisos.
_LETRAS_PALAVRA = set("aeoéàóôêºª") | set("bcdfghijklmnpqrstuvwxyz")


def detectar_injecao(paginas: list[str]) -> list[dict]:
    achados = []
    for i, p in enumerate(paginas, start=1):
        for m in _RE_INJECAO.finditer(p):
            achados.append({"pagina": i, "trecho": p[max(0, m.start() - 40): m.end() + 40]})
    return achados

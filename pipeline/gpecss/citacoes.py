"""Verificação literal das unidades e citações contra o texto canônico das páginas."""

from __future__ import annotations

import re

from .estrutura import texto_exibicao, vocabulario


def normalizar_comparacao(s: str) -> str:
    """Normalização usada para comparar citações: apenas espaços e aspas tipográficas.

    Não altera letras, acentos, pontuação ou maiúsculas — uma citação só é aceita
    se coincidir com o texto armazenado nesses aspectos.
    """
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return re.sub(r"\s+", " ", s).strip()


def verificar_unidades(texto_doc: dict) -> list[str]:
    """Reconstrói cada unidade a partir dos segmentos e compara com o texto gravado."""
    paginas = [p["texto"] for p in texto_doc["paginas"]]
    vocab = vocabulario(paginas)
    erros = []
    for u in texto_doc["unidades"]:
        for pag, ini, fim in u["segmentos"]:
            if not (1 <= pag <= len(paginas)) or not (0 <= ini < fim <= len(paginas[pag - 1])):
                erros.append(f"{u['id']}: segmento fora dos limites ({pag}, {ini}, {fim})")
                break
        else:
            reconstruido = texto_exibicao(u["segmentos"], paginas, vocab)
            if reconstruido != u["texto"]:
                erros.append(f"{u['id']}: texto não corresponde aos segmentos da página")
    return erros


def citacao_presente(citacao: str, texto_fonte: str) -> bool:
    """Mesma regra de app/js/nucleo/verificacao.js: literal, salvo a caixa da primeira letra."""
    c = normalizar_comparacao(citacao).strip(".… ")
    if not c:
        return False
    f = normalizar_comparacao(texto_fonte)
    if c in f:
        return True
    resto = c[1:]
    return bool(resto) and (c[0].lower() + resto in f or c[0].upper() + resto in f)

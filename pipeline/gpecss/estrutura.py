"""Identificação de partes, títulos, artigos, parágrafos, incisos e alíneas.

Cada unidade (dispositivo) guarda `segmentos`: a lista de intervalos
[página, início, fim] no texto canônico das páginas. O texto exibido é
reconstruído desses intervalos por `texto_exibicao`, e a verificação de
citações refaz essa reconstrução para garantir correspondência literal.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

ROMANOS = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def romano_para_int(s: str) -> int | None:
    s = s.upper()
    if not s or any(c not in ROMANOS for c in s):
        return None
    total, anterior = 0, 0
    for c in reversed(s):
        v = ROMANOS[c]
        total = total - v if v < anterior else total + v
        anterior = max(anterior, v)
    return total


def ordinal(n: int, sufixo: str = "") -> str:
    return (f"{n}º" if n < 10 else str(n)) + (f"-{sufixo}" if sufixo else "")


def _sem_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def slug(s: str, limite: int = 40) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _sem_acentos(s).lower()).strip("-")[:limite].strip("-")


# --- padrões ---------------------------------------------------------------

# Sufixo de artigo acrescido ("Art. 5º-A") exige hífen colado à letra; "Art. 1º - O serviço"
# é artigo 1 seguido de travessão, não "Art. 1º-O".
RE_ARTIGO = re.compile(r"^Art(?:igo)?\.?\s*(\d+)\s*(?:[º°o]|\.)?(?:-([A-Z])(?=[\s.:]))?\s*\.?\s*[-–—]?\s*")
# "Parágrafo único" só com inicial maiúscula e sem continuar como remissão ("Parágrafo único do artigo 18").
RE_ANEXO_NUMERADO = re.compile(r"^ANEXO\s+([IVXLC]+|\d+)\s*$")
RE_TITULO_ANEXO = re.compile(r"^(C[ÓO]DIGO|REGULAMENTO|REGIMENTO|ANEXO|POL[ÍI]TICA|NORMAS|TABELA|ESTATUTO|INSTRUMENTA)\S*\s+\S{2,}")
RE_NOVA_REDACAO = re.compile(r"(seguinte|nova)\s+reda[çc][ãa]o\s*:?\s*$|seguintes\s+termos\s*:\s*$|(acrescid|inclu[ií]d|alterad)[oa]s?\b.*\b(artigo|art\.)\s*\d+[^:]*:\s*$|(passa|passam)\s+a\s+(vigorar|ter)\b.*(reda[çc][ãa]o|acrescid[oa]).*:\s*$",
                              re.I)
RE_PARAGRAFO = re.compile(r"^(?:§\s*(\d+)\s*[º°o]?\s*\.?\s*[-–—]?|PAR[ÁA]GRAFO\s+[ÚU]NICO|Par[áa]grafo\s+[úu]nico(?!\s+d[oa]s?\s)"
                          r"|Par[áa]grafo\s+(?i:(primeiro|segundo|terceiro|quarto|quinto|sexto|s[ée]timo|oitavo|nono|d[ée]cimo))\b"
                          r"(?!\s+d[oa]s?\s))"
                          r"\s*\.?\s*[-–—:]?\s*")
ORDINAIS_EXTENSO = {"primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4, "quinto": 5, "sexto": 6,
                    "setimo": 7, "sétimo": 7, "oitavo": 8, "nono": 9, "decimo": 10, "décimo": 10}
RE_INCISO = re.compile(r"^([IVXLC]{1,6})\s*[-–—.)]\s+")
RE_ALINEA = re.compile(r"^([a-z])\s*[-–)]\s*(?=\S)")
RE_TITULO = re.compile(r"^T[ÍI]TULO\s+([IVXLC]+|[ÚU]NICO)\b", re.I)
RE_CAPITULO = re.compile(r"^CAP[ÍI]TULO\s+([IVXLC]+|[ÚU]NICO)\b", re.I)
RE_SECAO = re.compile(r"^SE[ÇC][ÃA]O\s+([IVXLC]+|[ÚU]NICA)\b", re.I)
RE_ASSINATURA = re.compile(r"^(Conselheir[oa]\s+)?President[ea]\s+(do|da)\s+(CFESS|Cfess|Conselho)\b", re.I)
RE_SUBTITULO = re.compile(r"^D[aoe]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]")

# Marcos de início de partes (textos normativos distintos dentro de um mesmo arquivo).
PADROES_PARTE = [
    (re.compile(r"^RESOLU[ÇC][ÃA]O\s+CFESS\s+N", re.I), "normativa"),
    (re.compile(r"^Lei\s+n\s*[ºo°.]?\s*\.?\s*[\d.]+\s*,\s*de\s", re.I), "normativa"),
    (re.compile(r"^Princ[íi]pios\s+Fundamentais$", re.I), "normativa"),
    (re.compile(r"^Introdu[çc][ãa]o$", re.I), "apresentacao"),
    (re.compile(r"^Apresenta[çc][ãa]o\b", re.I), "apresentacao"),
    (re.compile(r"^Sum[áa]rio$", re.I), "pre_textual"),
]


@dataclass
class Linha:
    pagina: int
    inicio: int
    fim: int
    texto: str


@dataclass
class Unidade:
    id: str
    tipo: str
    rotulo: str
    parte: str
    hierarquia: list[str]
    pai: str | None
    linhas: list[Linha] = field(default_factory=list)

    def segmentos(self) -> list[list[int]]:
        segs: list[list[int]] = []
        for ln in self.linhas:
            if segs and segs[-1][0] == ln.pagina and segs[-1][2] + 1 == ln.inicio:
                segs[-1][2] = ln.fim
            else:
                segs.append([ln.pagina, ln.inicio, ln.fim])
        return segs


def linhas_de(paginas: list[str]) -> list[list[Linha]]:
    resultado = []
    for n, texto in enumerate(paginas, start=1):
        linhas, pos = [], 0
        for bruto in texto.split("\n"):
            if bruto.strip():
                linhas.append(Linha(n, pos, pos + len(bruto), bruto))
            pos += len(bruto) + 1
        resultado.append(linhas)
    return resultado


def _chave_repeticao(s: str) -> str:
    return re.sub(r"\d+", "#", s.lower()).strip()


# Linhas do timbre institucional dos Conselhos (endereço, contato, autenticação
# eletrônica, slogans de gestão). Não são texto normativo onde quer que apareçam.
RE_TIMBRE = re.compile(
    r"^_{10,}\s*$"
    r"|^(SHS|SCS|SRTVS|SEPN)\s*[-–]\s*Quadra"
    r"|(Fone|Tel\.?)\s*:.*\(61\)"
    r"|E-?mail:\s*\S*@cfess"
    r"|Home Page:\s*http"
    r"|^Autentique pelo link"
    r"|^fornecendo o código a seguir"
    r"|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.?$"
    r"|^Gestão \d{4}\s*[/-]\s*\d{4}\s*[–-]"
    r"|^Endereço:\s*S[CH]S",
    re.I)
JANELA_BORDA = 5


def linhas_repetitivas(por_pagina: list[list[Linha]]) -> set[tuple[int, int]]:
    """Cabeçalhos/rodapés repetidos, linhas de timbre e números de página isolados."""
    n = len(por_pagina)
    candidatos = Counter()
    for linhas in por_pagina:
        # Fragmentos de texto corrido ("redação:", "Art. 2º") se repetem em normas que
        # alteram outras; cabeçalho e rodapé não terminam em ":", ";" ou ",".
        bordas = {_chave_repeticao(l.texto) for l in linhas[:JANELA_BORDA] + linhas[-JANELA_BORDA:]
                  if len(l.texto) <= 120 and not l.texto.rstrip().endswith((":", ";", ","))
                  and not RE_ARTIGO.match(l.texto)}
        candidatos.update(bordas)
    # Em documentos curtos basta repetir em 2 páginas; nos longos, em 20% delas (mín. 3).
    limiar = 2 if n <= 4 else max(3, int(0.2 * n))
    repetidas = {k for k, c in candidatos.items() if c >= limiar}
    excluir = set()
    for linhas in por_pagina:
        for l in linhas[:JANELA_BORDA] + linhas[-JANELA_BORDA:]:
            if _chave_repeticao(l.texto) in repetidas or re.fullmatch(r"\d{1,4}", l.texto):
                excluir.add((l.pagina, l.inicio))
        for l in linhas:
            if RE_TIMBRE.search(l.texto):
                excluir.add((l.pagina, l.inicio))
    return excluir


def numero_impresso(linhas: list[Linha]) -> str | None:
    for l in linhas[:1] + linhas[-1:]:
        if re.fullmatch(r"\d{1,4}", l.texto):
            return l.texto
    return None


def vocabulario(paginas: list[str]) -> set[str]:
    return {w.lower() for w in re.findall(r"[^\W\d_]+", " ".join(paginas))}


def juntar_linhas(textos: list[str], vocab: set[str]) -> str:
    """Une linhas em texto corrido; repara hifenização de fim de linha.

    A hifenização só é removida quando a palavra unida aparece sem hífen em
    outro ponto do mesmo documento; caso contrário o hífen é mantido
    (preserva compostos como "ético-político").
    """
    saida = ""
    for t in textos:
        t = re.sub(r"\s+", " ", t).strip()
        if not saida:
            saida = t
            continue
        m = re.search(r"([^\W\d_]+)-$", saida)
        if m and t[:1].isalpha() and t[:1].islower():
            prox = re.match(r"[^\W\d_]+", t)
            unida = (m.group(1) + (prox.group(0) if prox else "")).lower()
            if unida in vocab:
                saida = saida[:-1] + t
            else:
                saida = saida + t
        else:
            saida = saida + " " + t
    return saida.strip()


def texto_exibicao(segmentos: list[list[int]], paginas: list[str], vocab: set[str]) -> str:
    textos = []
    for pag, ini, fim in segmentos:
        textos.extend(paginas[pag - 1][ini:fim].split("\n"))
    return juntar_linhas([t for t in textos if t.strip()], vocab)


def _eh_continuacao_de_titulo(l: Linha) -> bool:
    t = l.texto
    return (len(t) <= 90 and not RE_ARTIGO.match(t) and not RE_PARAGRAFO.match(t)
            and not t.endswith((";", ",")) and not RE_INCISO.match(t))


class Segmentador:
    def __init__(self, paginas: list[str], doc_id: str, partes_manuais: list[dict] | None = None):
        self.paginas = paginas
        self.doc_id = doc_id
        self.por_pagina = linhas_de(paginas)
        self.excluir = linhas_repetitivas(self.por_pagina)
        self.partes_manuais = partes_manuais
        self.unidades: list[Unidade] = []
        self.partes: list[dict] = []
        self._ids: set[str] = set()

    # -- utilidades ------------------------------------------------------
    def _novo_id(self, base: str) -> str:
        id_, k = base, 2
        while id_ in self._ids:
            id_, k = f"{base}~{k}", k + 1
        self._ids.add(id_)
        return id_

    def _linhas_validas(self):
        for linhas in self.por_pagina:
            for l in linhas:
                if (l.pagina, l.inicio) not in self.excluir:
                    yield l

    def _parte_manual(self, pagina: int):
        for p in self.partes_manuais or []:
            if p["pagina_inicio"] <= pagina <= p["pagina_fim"]:
                return p
        return None

    # -- algoritmo principal -------------------------------------------
    def executar(self) -> list[Unidade]:
        linhas = list(self._linhas_validas())
        parte = {"rotulo": "Texto", "tipo": "normativa", "slug": "texto", "pagina_inicio": 1}
        self.partes.append(parte)
        hier: dict[str, str | None] = {"titulo": None, "capitulo": None, "secao": None, "subtitulo": None}
        atual: Unidade | None = None
        artigo: Unidade | None = None
        paragrafo: Unidade | None = None
        inciso: Unidade | None = None
        ultimo_artigo = 0
        seq = {"par": 0, "inc": 0, "ali": "", "pri": 0}
        trecho_n = 0
        i = 0

        def hierarquia():
            return [h for h in (hier["titulo"], hier["capitulo"], hier["secao"], hier["subtitulo"]) if h]

        def abrir(tipo, rotulo, id_base, pai):
            nonlocal atual
            u = Unidade(self._novo_id(f"{parte['slug']}:{id_base}"), tipo, rotulo, parte["rotulo"],
                        hierarquia(), pai)
            self.unidades.append(u)
            atual = u
            return u

        def nova_parte(rotulo, tipo, pagina, slug_fixo=None, extras=None):
            nonlocal parte, artigo, paragrafo, inciso, atual, ultimo_artigo, trecho_n, apos_fecho
            parte["pagina_fim"] = pagina if atual is None else max(
                ln.pagina for ln in (atual.linhas or [Linha(pagina, 0, 0, "")]))
            base = slug_fixo or slug(rotulo, 24) or "parte"
            s, k = base, 2
            while any(p["slug"] == s for p in self.partes):
                s, k = f"{base}-{k}", k + 1
            parte = {"rotulo": rotulo, "tipo": tipo, "slug": s, "pagina_inicio": pagina, **(extras or {})}
            self.partes.append(parte)
            for h in hier:
                hier[h] = None
            artigo = paragrafo = inciso = atual = None
            ultimo_artigo = 0
            trecho_n = 0
            apos_fecho = False
            seq.update(par=0, inc=0, ali="", pri=0)

        # Texto citado em nova redação ("passa a vigorar com a seguinte redação:
        # Art. 1º …"): artigos citados com número não superior ao do artigo que os
        # introduz pertencem a esse artigo, e não à norma que está sendo lida.
        redacao_ativa = False
        ativada_em = -2
        # Texto após a assinatura (formulários, modelos, tabelas) é anexo: peso menor na busca.
        apos_fecho = False
        while i < len(linhas):
            l = linhas[i]
            t = l.texto
            m_cit = RE_ARTIGO.match(t)
            if redacao_ativa and atual is not None:
                # Só o artigo seguinte da própria norma encerra o texto citado: o
                # citado pode ter número maior (Res. 828/2017 cita o Art. 17 da 512).
                # É trecho citado, mesmo com o número seguinte: "Art. 2º (...)", "Art. 2º"
                # sozinho na linha e o artigo logo após "… a seguinte redação:".
                resto = t[m_cit.end():].strip() if m_cit else ""
                if (m_cit and int(m_cit.group(1)) == ultimo_artigo + 1 and not m_cit.group(2)
                        and resto and not re.match(r"\(\s*\.\.\.\s*\)|…", resto)
                        and ativada_em != i - 1):
                    redacao_ativa = False  # retomou a numeração própria da norma
                else:
                    atual.linhas.append(l)
                    i += 1
                    continue
            # A fórmula pode estar partida em duas linhas ("passa a ter a seguinte" / "redação:").
            if artigo is not None and (RE_NOVA_REDACAO.search(t) or (
                    i > 0 and RE_NOVA_REDACAO.search(linhas[i - 1].texto + " " + t))):
                redacao_ativa = True
                ativada_em = i

            # 1. Partes (manuais têm precedência sobre as detectadas)
            pm = self._parte_manual(l.pagina)
            if self.partes_manuais is not None:
                if pm and pm["rotulo"] != parte["rotulo"]:
                    nova_parte(pm["rotulo"], pm.get("tipo", "normativa"), l.pagina, pm.get("slug"),
                               {k: v for k, v in pm.items() if k in {"documento_relacionado", "descricao"}})
                elif not pm:
                    i += 1
                    continue  # páginas fora das partes declaradas não são indexadas
            else:
                # Sem mapa manual, o documento é tratado como texto único. Só o
                # recomeço da numeração de artigos (anexo, regulamento anexo, texto
                # republicado) abre nova parte — e o processamento gera alerta para
                # que a conferência humana declare o mapa de partes correto.
                m_rein = RE_ARTIGO.match(t)
                # Título em maiúsculas de um texto anexo ("CÓDIGO PROCESSUAL DE ÉTICA",
                # "REGULAMENTO …") depois dos artigos da resolução abre a parte do anexo.
                m_anx = RE_ANEXO_NUMERADO.match(t)
                if m_anx and self.unidades:
                    nova_parte(f"Anexo {m_anx.group(1)}", "normativa", l.pagina, f"anexo-{m_anx.group(1).lower()}")
                    i += 1
                    continue
                if ultimo_artigo > 1 and RE_TITULO_ANEXO.match(t) and t.upper() == t:
                    nova_parte(f"Anexo — {t.strip().rstrip('.:')}", "normativa", l.pagina, slug(t, 24) or "anexo")
                    i += 1
                    continue
                if m_rein and int(m_rein.group(1)) == 1 and not m_rein.group(2) and ultimo_artigo > 1:
                    nova_parte(f"Anexo ou texto subsequente (a partir da p. {l.pagina})", "normativa",
                               l.pagina, f"anexo-p{l.pagina}")

            # 2. Títulos, capítulos e seções (e a linha de denominação seguinte)
            m_tit = RE_TITULO.match(t) or RE_CAPITULO.match(t) or RE_SECAO.match(t)
            if m_tit:
                nivel = "titulo" if RE_TITULO.match(t) else "capitulo" if RE_CAPITULO.match(t) else "secao"
                partes_nome = [t]
                while (i + 1 < len(linhas) and len(partes_nome) < 4
                       and _eh_continuacao_de_titulo(linhas[i + 1])
                       and not (RE_TITULO.match(linhas[i + 1].texto) or RE_CAPITULO.match(linhas[i + 1].texto)
                                or RE_SECAO.match(linhas[i + 1].texto) or RE_ALINEA.match(linhas[i + 1].texto))):
                    i += 1
                    partes_nome.append(linhas[i].texto)
                hier[nivel] = partes_nome[0] + (" — " + " ".join(partes_nome[1:]) if len(partes_nome) > 1 else "")
                if nivel == "titulo":
                    hier["capitulo"] = hier["secao"] = hier["subtitulo"] = None
                elif nivel == "capitulo":
                    hier["secao"] = hier["subtitulo"] = None
                else:
                    hier["subtitulo"] = None
                atual = None
                i += 1
                continue

            m_art = RE_ARTIGO.match(t)
            if m_art and parte["tipo"] != "apresentacao":
                n = int(m_art.group(1))
                suf = m_art.group(2) or ""
                if n >= ultimo_artigo or suf:
                    ultimo_artigo = n
                    artigo = abrir("artigo", f"Art. {ordinal(n, suf)}", f"art-{n}{suf.lower()}", None)
                    paragrafo = inciso = None
                    seq.update(par=0, inc=0, ali="")
                    atual.linhas.append(l)
                    i += 1
                    continue

            # Subtítulos internos ("Das Penalidades") entre dispositivos
            if (atual is not None and RE_SUBTITULO.match(t) and len(t) <= 60
                    and not t.endswith((".", ";", ",", ":")) and atual.linhas
                    and atual.linhas[-1].texto.endswith((".", ";", ":"))):
                hier["subtitulo"] = t
                atual = None
                i += 1
                continue

            if artigo is not None:
                m_par = RE_PARAGRAFO.match(t)
                if m_par:
                    k = (int(m_par.group(1)) if m_par.group(1)
                         else ORDINAIS_EXTENSO[m_par.group(2).lower()] if m_par.group(2) else 0)
                    if k == 0 or k == seq["par"] + 1:
                        seq["par"] = k
                        rot = f"{artigo.rotulo}, " + ("parágrafo único" if k == 0 else f"§ {ordinal(k)}")
                        paragrafo = abrir("paragrafo", rot, artigo.id.split(":", 1)[1] + (":par-unico" if k == 0 else f":par-{k}"), artigo.id)
                        inciso = None
                        seq.update(inc=0, ali="")
                        atual.linhas.append(l)
                        i += 1
                        continue
                m_inc = RE_INCISO.match(t)
                if m_inc:
                    k = romano_para_int(m_inc.group(1))
                    if k is not None and k == seq["inc"] + 1:
                        seq["inc"] = k
                        base = paragrafo or artigo
                        inciso = abrir("inciso", f"{base.rotulo}, inciso {m_inc.group(1)}",
                                       base.id.split(":", 1)[1] + f":inc-{k}", base.id)
                        seq["ali"] = ""
                        atual.linhas.append(l)
                        i += 1
                        continue
                m_ali = RE_ALINEA.match(t)
                if m_ali:
                    letra = m_ali.group(1)
                    esperado = "a" if not seq["ali"] else chr(ord(seq["ali"]) + 1)
                    if letra == esperado:
                        seq["ali"] = letra
                        base = inciso or paragrafo or artigo
                        abrir("alinea", f"{base.rotulo}, alínea {letra}",
                              base.id.split(":", 1)[1] + f":ali-{letra}", base.id)
                        atual.linhas.append(l)
                        i += 1
                        continue

            # Princípios fundamentais (incisos romanos fora de artigos)
            if artigo is None and parte["tipo"] == "normativa" and "princ" in parte["rotulo"].lower():
                m_inc = RE_INCISO.match(t) or re.match(r"^([IVXLC]{1,6})\.\s*", t)
                if m_inc:
                    k = romano_para_int(m_inc.group(1))
                    if k == seq["pri"] + 1:
                        seq["pri"] = k
                        abrir("principio", f"Princípio fundamental {m_inc.group(1)}", f"principio-{k}", None)
                        atual.linhas.append(l)
                        i += 1
                        continue

            # Assinatura ("NOME" + "Conselheira Presidente do Cfess") e nota de
            # publicação não fazem parte do último artigo: viram trecho próprio.
            if (artigo is not None and i + 1 < len(linhas) and RE_ASSINATURA.match(linhas[i + 1].texto)
                    and len(t) <= 80 and not t.endswith((".", ";", ",", ":"))):
                artigo = paragrafo = inciso = None
                abrir("trecho", f"{parte['rotulo']} — assinatura e publicação", "fecho", None)
                apos_fecho = True
                atual.linhas.append(l)
                i += 1
                continue

            # Continuação ou trecho livre
            if atual is not None:
                atual.linhas.append(l)
            else:
                trecho_n += 1
                tipo = "apresentacao" if parte["tipo"] == "apresentacao" else "anexo" if apos_fecho else "trecho"
                if parte["tipo"] == "pre_textual":
                    i += 1
                    continue
                abrir(tipo, f"{parte['rotulo']} — {'anexo' if tipo == 'anexo' else 'trecho'} (p. {l.pagina})",
                      f"p{l.pagina}-t{trecho_n}", None)
                atual.linhas.append(l)
            # Trechos livres são quebrados em parágrafos de tamanho moderado
            if atual is not None and atual.tipo in {"trecho", "apresentacao", "anexo"}:
                tam = sum(len(x.texto) for x in atual.linhas)
                if tam > 700 and t.endswith((".", ":", ";")):
                    atual = None
            i += 1

        if self.partes:
            ultima = max((ln.pagina for u in self.unidades for ln in u.linhas), default=len(self.paginas))
            self.partes[-1].setdefault("pagina_fim", ultima)
        self.unidades = [u for u in self.unidades if u.linhas]
        usadas = {u.parte for u in self.unidades}
        self.partes = [p for p in self.partes if p["rotulo"] in usadas]
        return self.unidades


def segmentar(paginas: list[str], doc_id: str, partes_manuais: list[dict] | None = None) -> dict:
    seg = Segmentador(paginas, doc_id, partes_manuais)
    unidades = seg.executar()
    vocab = vocabulario(paginas)
    saida = []
    for u in unidades:
        segs = u.segmentos()
        saida.append({
            "id": u.id, "tipo": u.tipo, "rotulo": u.rotulo, "parte": u.parte,
            "hierarquia": u.hierarquia, "pai": u.pai,
            "pagina_inicio": segs[0][0], "pagina_fim": segs[-1][0],
            "segmentos": segs, "texto": texto_exibicao(segs, paginas, vocab),
        })
    impressos = {i + 1: numero_impresso(ls) for i, ls in enumerate(seg.por_pagina)}
    # Só mantém a numeração impressa coerente com o deslocamento predominante
    # (evita confundir números do sumário com números de página).
    desloc = Counter(i - int(v) for i, v in impressos.items() if v)
    if desloc:
        d = desloc.most_common(1)[0][0]
        impressos = {str(i): v for i, v in impressos.items() if v and i - int(v) == d}
    else:
        impressos = {}
    return {"partes": seg.partes, "unidades": saida,
            "paginas_impressas": impressos,
            "linhas_excluidas": len(seg.excluir)}

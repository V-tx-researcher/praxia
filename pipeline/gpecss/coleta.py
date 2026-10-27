"""Coletor do acervo de legislação do portal do CFESS.

Etapas:
  descobrir  → percorre as listagens das categorias pertinentes e cria registros
               em estado `descoberto` (apenas metadados da página oficial);
  baixar     → baixa os arquivos dos documentos indicados, verifica tipo e
               integridade, calcula SHA-256 e detecta duplicatas e alterações.

Nada aqui aprova documentos: o resultado sempre segue para a fila de conferência.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from . import catalogo
from .esquema import agora_iso, registro_vazio, transitar
from .rede import Cliente

BASE_CFESS = "https://www.cfess.org.br"

# Categorias do portal (/legislacao/index?LegislacaoSearch[id_legislacao_categoria]=N).
# As categorias 6 (legislações sociais), 7 (diretrizes curriculares) e
# 8 (graduação a distância) ficam fora do acervo principal — ver DOCUMENT_POLICY.md.
CATEGORIAS_CFESS = {
    3: "Regulamentação da profissão",
    4: "Resoluções do CFESS",
    1: "Portarias do CFESS",
    9: "Orientações Normativas",
}
# Listagem geral sem filtro de categoria: alcança documentos que o portal não
# classificou em nenhuma categoria (ex.: Res. 660/2013, encontrada em 27/10/2026).
SEM_CATEGORIA = 0

# Termos que costumam indicar atos administrativos internos (concursos, eleições,
# nomeações etc.). Geram apenas um alerta para a conferência humana.
_TERMOS_ADMINISTRATIVOS = [
    "concurso publico", "nomeacao", "posse", "convocacao", "eleicao", "eleitoral",
    "comissao eleitoral", "anuidade", "taxa", "multa", "orcamento", "prestacao de contas",
    "diaria", "jeton", "ferias", "cargo", "empregado", "licitacao", "plano de cargos",
    "calendario", "recesso", "delegado", "quadro de pessoal", "remuneracao",
]

_RE_NUM_ANO = re.compile(
    r"(?:n[ºo°.]*\s*)?(\d{1,2}\.?\d{3}|\d{1,4})\s*(?:/|,?\s*de\s+.*?)(\d{4})", re.I
)


def sem_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def slug(s: str) -> str:
    s = sem_acentos(s).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def inferir_identificacao(titulo: str, categoria: str | None) -> dict:
    """Extrai tipo, número e ano do título. Retorna apenas o que for inequívoco."""
    t = sem_acentos(titulo).lower()
    tipo, orgao = "outro", "CFESS"
    if t.startswith("resolucao"):
        tipo = "resolucao"
    elif t.startswith("portaria"):
        tipo = "portaria"
    elif t.startswith("lei"):
        tipo, orgao = "lei", "Congresso Nacional"
    elif t.startswith("decreto"):
        tipo, orgao = "decreto", "Presidência da República"
    elif "codigo de etica" in t:
        tipo = "codigo_etica"
    elif "orientacao normativa" in t:
        tipo = "orientacao_normativa"
    elif "politica nacional de fiscalizacao" in t:
        tipo = "politica_institucional"
    elif categoria == "Orientações Normativas":
        tipo = "orientacao_normativa"
    numero = ano = None
    # Primeiro, o número no início do título ("Resolução 968/2021 - Revogada pela nº 988…"
    # deve resultar em 968/2021, não no número da norma revogadora).
    m = re.match(r"(?:resolucao|portaria|lei|decreto|orientacao normativa)\s*(?:n[ºo°.]*\s*)?"
                 r"([\d.]+)\s*(?:/\s*(\d{4})|,\s*de\s+\d{1,2}\s+de\s+\w+\s+de\s+(\d{4}))", t)
    if not m:
        m = re.search(r"(?:n[ºo°.]*\s*|normativa\s+|portaria\s+)([\d.]+)\s*(?:/\s*(\d{4})|,\s*de\s+\d{1,2}\s+de\s+\w+\s+de\s+(\d{4}))", t)
    if m:
        numero = m.group(1).replace(".", "").strip(".")
        ano = int(m.group(2) or m.group(3))
    if tipo == "codigo_etica":
        numero, ano = None, 1993 if "10" in t else None
    return {"tipo_documental": tipo, "orgao_emissor": orgao, "numero": numero, "ano": ano}


def gerar_id(ident: dict, portal_id: str) -> str:
    tipo, num, ano = ident["tipo_documental"], ident["numero"], ident["ano"]
    if tipo == "codigo_etica":
        return f"cfess-codigo-etica-{ano or portal_id}"
    if tipo in {"lei", "decreto"} and num and ano:
        return f"{tipo}-{num}-{ano}"
    if num and ano:
        return f"cfess-{tipo.replace('_', '-')}-{num}-{ano}"
    return f"cfess-legislacao-{portal_id}"


_RE_SITUACAO_PORTAL = re.compile(
    r"(revogad[ao][^.;)]*|invalidad[ao][^.;)]*|efeitos? suspens[^.;)]*|sem efeito[^.;)]*|suspens[ao] (?:por|pela)[^.;)]*)",
    re.I)


def alerta_situacao_portal(titulo: str, ementa: str | None) -> list[str]:
    """Indicações de revogação/invalidade escritas no próprio portal.

    Não alteram a situação normativa: são encaminhadas à conferência humana.
    """
    achados = _RE_SITUACAO_PORTAL.findall(f"{titulo} {ementa or ''}")
    return [f"portal_indica_situacao:{a.strip()[:120]}" for a in dict.fromkeys(achados)]


def alerta_escopo(titulo: str, ementa: str | None) -> list[str]:
    texto = sem_acentos(f"{titulo} {ementa or ''}").lower()
    achados = [t for t in _TERMOS_ADMINISTRATIVOS if re.search(rf"\b{t}\b", texto)]
    return [f"possivel_ato_administrativo:{','.join(achados)}"] if achados else []


def _data_br(s: str | None) -> str | None:
    if not s:
        return None
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", s)
    if not m:
        return None
    try:
        return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date().isoformat()
    except ValueError:
        return None


def ler_pagina_documento(html: bytes, url: str) -> dict:
    """Interpreta a página /legislacao/view/<id> do portal do CFESS."""
    s = BeautifulSoup(html, "lxml")
    main = s.find("main")
    bloco = main.select_one("div.row > div") if main else None
    if bloco is None:
        raise ValueError("estrutura da página não reconhecida")
    h = bloco.find(["h3", "h2", "h1"])
    titulo = h.get_text(" ", strip=True) if h else ""
    texto = bloco.get_text("\n", strip=True)
    tipo_portal = None
    m = re.search(r"Tipo:\s*(.+)", texto)
    if m:
        tipo_portal = m.group(1).strip()
    m = re.search(r"Publicado em\s*(\d{2}/\d{2}/\d{4})", texto)
    publicado = _data_br(m.group(1)) if m else None
    # Texto descritivo da página oficial (ementa, notas sobre alterações e anexos),
    # sem título, tipo, data e nomes de arquivos.
    descartar = {titulo, "Anexos"} | {a.get_text(" ", strip=True) for a in bloco.find_all("a")}
    paragrafos = [ln for ln in texto.split("\n")
                  if ln and ln not in descartar and not ln.startswith(("Tipo:", "Publicado em"))]
    ementa = " ".join(paragrafos)[:2000] if paragrafos else None
    anexos, externos = [], []
    # Anexos ficam na coluna lateral (div.list-view > a.btn-anexos); os atalhos
    # institucionais da mesma coluna (box-atalho-lateral) são ignorados.
    links = list(bloco.find_all("a")) + list(main.select("div.list-view a"))
    for a in links:
        href = (a.get("href") or "").strip()
        if not href or href.startswith(("javascript:", "#", "mailto:")):
            continue
        absoluto = urljoin(url, href)
        if "/uploads/" in urlparse(absoluto).path:
            if any(x["url"] == absoluto for x in anexos):
                continue
            anexos.append({"url": absoluto, "nome": a.get_text(" ", strip=True) or absoluto.rsplit("/", 1)[-1]})
        elif urlparse(absoluto).netloc not in {"www.cfess.org.br", "cfess.org.br"}:
            externos.append({"url": absoluto, "texto": a.get_text(" ", strip=True)})
    return {"titulo": titulo, "tipo_portal": tipo_portal, "publicado_em": publicado,
            "ementa": ementa, "texto_pagina": texto, "anexos": anexos, "externos": externos}


def listar_categoria(cliente: Cliente, cat: int, max_paginas: int = 60) -> list[str]:
    vistos: list[str] = []
    for pagina in range(1, max_paginas + 1):
        url = (f"{BASE_CFESS}/legislacao/index?page={pagina}" if cat == SEM_CATEGORIA else
               f"{BASE_CFESS}/legislacao/index?LegislacaoSearch%5Bid_legislacao_categoria%5D={cat}&page={pagina}")
        r = cliente.obter(url)
        s = BeautifulSoup(r.content, "lxml")
        novos = []
        for a in s.find_all("a"):
            h = a.get("href") or ""
            if h.startswith("/legislacao/view/"):
                u = urljoin(BASE_CFESS, h)
                if u not in vistos and u not in novos:
                    novos.append(u)
        if not novos:
            break
        vistos.extend(novos)
    return vistos


def descobrir(cliente: Cliente | None = None, categorias=None, limite_paginas: int = 60, atualizar_metadados: bool = False,
              log=print) -> dict:
    cliente = cliente or Cliente()
    existentes = catalogo.por_url_fonte()
    resumo = {"novos": 0, "ja_existentes": 0, "alterados": 0, "erros": 0}
    for cat in categorias or CATEGORIAS_CFESS:
        nome_cat = "Listagem geral" if cat == SEM_CATEGORIA else CATEGORIAS_CFESS.get(cat, str(cat))
        urls = listar_categoria(cliente, cat, limite_paginas)
        log(f"[{nome_cat}] {len(urls)} páginas de documentos")
        for url in urls:
            portal_id = url.rstrip("/").split("/legislacao/view/")[1].split("/")[0]
            try:
                info = ler_pagina_documento(cliente.obter(url).content, url)
            except Exception as e:  # registra e segue: uma página ruim não interrompe a coleta
                resumo["erros"] += 1
                catalogo.registrar_evento("erro_descoberta", url=url, erro=str(e))
                continue
            assinatura = hashlib.sha256(
                repr((info["titulo"], info["ementa"], [a["url"] for a in info["anexos"]],
                      [e["url"] for e in info["externos"]])).encode()).hexdigest()
            if url in existentes:
                reg = existentes[url]
                if atualizar_metadados:
                    # Reaplica a leitura da página sem mexer em identidade, estado ou conferência.
                    reg["ementa"] = info["ementa"]
                    novos = alerta_escopo(info["titulo"], info["ementa"]) + \
                        alerta_situacao_portal(info["titulo"], info["ementa"])
                    reg["alertas"] = sorted(set(a for a in reg["alertas"]
                                                if not a.startswith(("possivel_ato", "portal_indica"))) | set(novos))
                    catalogo.salvar(reg)
                if reg.get("portal", {}).get("assinatura_pagina") != assinatura:
                    reg.setdefault("portal", {})["assinatura_pagina"] = assinatura
                    reg["portal"]["anexos"] = info["anexos"]
                    reg["portal"]["externos"] = info["externos"]
                    if "pagina_oficial_alterada" not in reg["alertas"]:
                        reg["alertas"].append("pagina_oficial_alterada")
                    catalogo.salvar(reg)
                    catalogo.registrar_evento("pagina_alterada", id=reg["id"], url=url)
                    resumo["alterados"] += 1
                else:
                    resumo["ja_existentes"] += 1
                continue
            ident = inferir_identificacao(info["titulo"], nome_cat)
            id_ = gerar_id(ident, portal_id)
            if catalogo.existe(id_):
                id_ = f"{id_}-p{portal_id}"
            reg = registro_vazio(id_, info["titulo"], url)
            reg.update(ident)
            reg["ementa"] = info["ementa"]
            reg["data_publicacao"] = info["publicado_em"]
            reg["categoria_portal"] = nome_cat
            reg["portal"] = {"id": portal_id, "assinatura_pagina": assinatura,
                             "anexos": info["anexos"], "externos": info["externos"],
                             "descoberto_em": agora_iso()}
            reg["alertas"] = alerta_escopo(info["titulo"], info["ementa"]) +                 alerta_situacao_portal(info["titulo"], info["ementa"])
            if not info["anexos"] and not info["externos"]:
                reg["alertas"].append("sem_arquivo_vinculado")
            catalogo.salvar(reg)
            catalogo.registrar_evento("descoberto", id=id_, url=url)
            existentes[url] = reg
            resumo["novos"] += 1
    return resumo


def _tipo_arquivo(conteudo: bytes, content_type: str) -> str | None:
    if conteudo[:5] == b"%PDF-":
        return "application/pdf"
    inicio = conteudo[:2048].lstrip().lower()
    if inicio.startswith((b"<!doctype html", b"<html")) or b"<html" in inicio:
        return "text/html"
    return None


def baixar(id_: str, cliente: Cliente | None = None, incluir_historicos: bool = False,
           urls_extras: list[str] | None = None, log=print) -> dict:
    """Baixa os arquivos de um documento já descoberto.

    Por padrão baixa o primeiro anexo PDF (principal). Edições históricas
    anexadas (ex.: Códigos de 1947–1986) só com `incluir_historicos`.
    `urls_extras` permite indicar a fonte oficial externa (ex.: Planalto).
    """
    cliente = cliente or Cliente()
    reg = catalogo.carregar(id_)
    hashes = catalogo.por_hash()
    alvos = []
    anexos = [a for a in reg.get("portal", {}).get("anexos", []) if a["url"].lower().endswith(".pdf")]
    # Retificações, erratas e anexos avulsos não são o texto principal (ex.: na página da
    # Res. 657/2013 o primeiro anexo é a errata de 1 página).
    secundario = re.compile(r"retifica|errata|anexo", re.I)
    anexos.sort(key=lambda a: bool(secundario.search(a["nome"] + " " + a["url"].rsplit("/", 1)[-1])))
    for i, a in enumerate(anexos):
        if i == 0:
            alvos.append((a["url"], "principal"))
        elif incluir_historicos:
            alvos.append((a["url"], "edicao_historica"))
    for u in urls_extras or []:
        alvos.append((u, "html_oficial" if not u.lower().endswith(".pdf") else "principal"))
    if not alvos:
        raise RuntimeError(f"{id_}: nenhum arquivo para baixar")
    resultado = {"baixados": 0, "inalterados": 0, "alterados": 0}
    for url, papel in alvos:
        r = cliente.obter(url)
        if r.status_code != 200:
            if reg["estado_fluxo"] == "descoberto":
                transitar(reg, "erro_download", "coletor", f"HTTP {r.status_code} em {url}")
                catalogo.salvar(reg)
            raise RuntimeError(f"HTTP {r.status_code}: {url}")
        mime = _tipo_arquivo(r.content, r.headers.get("Content-Type", ""))
        if mime is None:
            raise RuntimeError(f"tipo de arquivo não reconhecido: {url}")
        sha = hashlib.sha256(r.content).hexdigest()
        anterior = next((a for a in reg["arquivos"] if a["url"] == url), None)
        if anterior and anterior["sha256"] == sha:
            anterior["verificado_em"] = agora_iso()
            resultado["inalterados"] += 1
            continue
        dono = hashes.get(sha)
        if dono and dono != id_:
            reg["alertas"].append(f"duplicata_de:{dono}")
        ext = ".pdf" if mime == "application/pdf" else ".html"
        destino = catalogo.DIR_BRUTOS / id_ / f"{sha[:16]}{ext}"
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(r.content)
        entrada = {"url": url, "papel": papel, "sha256": sha, "bytes": len(r.content),
                   "tipo_mime": mime, "data_coleta": agora_iso(), "verificado_em": agora_iso(),
                   "caminho_local": destino.relative_to(catalogo.RAIZ).as_posix(),
                   "versao": sha[:16]}
        if anterior:
            entrada["substitui"] = anterior["sha256"]
            reg["arquivos"].remove(anterior)
            reg["alertas"].append(f"arquivo_alterado:{anterior['sha256'][:16]}->{sha[:16]}")
            catalogo.registrar_evento("arquivo_alterado", id=id_, url=url, de=anterior["sha256"], para=sha)
            resultado["alterados"] += 1
        reg["arquivos"].append(entrada)
        resultado["baixados"] += 1
        log(f"  {id_}: {papel} {len(r.content):,} bytes sha256={sha[:16]}…")
    if reg["estado_fluxo"] in {"descoberto", "erro_download"}:
        transitar(reg, "baixado", "coletor", "arquivos obtidos da fonte oficial")
    elif resultado["alterados"] and reg["estado_fluxo"] in {"processado", "aguardando_conferencia", "aprovado", "publicado"}:
        # Arquivo mudou na fonte: o texto aprovado anterior deixa de valer até nova conferência.
        transitar(reg, "baixado", "coletor", "arquivo alterado na fonte oficial; reprocessar e reconferir")
    catalogo.salvar(reg)
    catalogo.registrar_evento("baixado", id=id_, **resultado)
    return resultado

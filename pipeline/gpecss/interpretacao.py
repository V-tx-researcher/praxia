"""Camada 2 (D41): documentos interpretativos oficiais do CFESS, dos CRESS e da ABEPSS.

Cartilhas, notas técnicas, pareceres jurídicos, parâmetros de atuação e políticas da
ABEPSS. Não são normas: entram num índice próprio (app/dados/interpretacao-*.json),
com a situação "orientação institucional", e a resposta sempre identifica a fonte.

Etapas (lista em dados/configuracao/camada2.json):
  baixar      → dados/brutos/camada2/<id>.pdf, com SHA-256 (cliente educado de rede.py)
  processar   → texto por página, trechos de até ~1.400 caracteres dentro de cada página,
                autoverificação literal (mesma regra das normas) e alertas
  indexar     → previa (todos os processados) ou publico (só os conferidos)

A conferência humana (D27) é registrada no próprio camada2.json (`conferido`), a partir
das marcações do revisor na Atividade nº 10, parte A.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from . import catalogo, citacoes, extracao
from .esquema import TIPOS_DOCUMENTAIS, agora_iso
from .estrutura import linhas_de, linhas_repetitivas, numero_impresso, texto_exibicao, vocabulario
from .rede import Cliente

CONFIG = catalogo.DADOS / "configuracao" / "camada2.json"
DIR_BRUTOS = catalogo.DIR_BRUTOS / "camada2"
DIR_TEXTOS = catalogo.DIR_TEXTOS / "camada2"
ARQUIVOS = {"publico": "interpretacao-publico.json", "previa": "interpretacao-previa.json"}

ORGAOS_ROTULO = {
    "CFESS": "CONSELHO FEDERAL DE SERVIÇO SOCIAL (Brasil)",
    "ABEPSS": "ASSOCIAÇÃO BRASILEIRA DE ENSINO E PESQUISA EM SERVIÇO SOCIAL",
}
LOCAL = {"CFESS": "Brasília, DF", "CRESS-SP": "São Paulo", "CRESS-PB": "João Pessoa"}

TAMANHO_MIN = 450
TAMANHO_MAX = 1400
# Páginas de expediente e catalogação: listas de nomes e dados editoriais, sem conteúdo.
RE_PAGINA_EDITORIAL = re.compile(r"Dados Internacionais de Catalogação|Ficha catalogr[áa]fica|\bISBN\b|^\s*Sum[áa]rio\s*$",
                                 re.I | re.M)
RE_FIM_FRASE = re.compile(r"[.!?;:»”\")]\s*$")
RE_LICENCA = re.compile(r"[^\n]{0,120}(reprodu[çc][ãa]o\s+(total|parcial|permitida|autorizada|proibida)|permitida\s+a\s+reprodu"
                        r"|Creative Commons|CC BY|direitos reservados)[^\n]{0,160}", re.I)
JANELA_CABECALHO = 2


def cabecalhos_de_capitulo(por_pagina) -> set[tuple[int, int]]:
    """Títulos correntes de capítulo nas bordas da página ("DOCUMENTOS E REGISTROS 153").

    Repetem-se só dentro do capítulo (menos de 20% das páginas), por isso escapam de
    `linhas_repetitivas`; aqui bastam 3 repetições nas duas primeiras ou últimas linhas.
    """
    chave = lambda t: re.sub(r"\d+", "#", t.lower()).strip()
    contagem: dict[str, int] = {}
    for linhas in por_pagina:
        for l in {id(x): x for x in linhas[:JANELA_CABECALHO] + linhas[-JANELA_CABECALHO:]}.values():
            if len(l.texto) <= 90:
                contagem[chave(l.texto)] = contagem.get(chave(l.texto), 0) + 1
    excluir = set()
    for linhas in por_pagina:
        for l in linhas[:JANELA_CABECALHO] + linhas[-JANELA_CABECALHO:]:
            if len(l.texto) <= 90 and contagem.get(chave(l.texto), 0) >= 3:
                excluir.add((l.pagina, l.inicio))
    return excluir


def carregar_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def salvar_config(cfg: dict) -> None:
    CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def _doc(cfg: dict, id_: str) -> dict:
    for d in cfg["documentos"]:
        if d["id"] == id_:
            return d
    raise KeyError(id_)


def baixar(ids: list[str] | None = None, log=print) -> None:
    cfg = carregar_config()
    cli = Cliente()
    DIR_BRUTOS.mkdir(parents=True, exist_ok=True)
    for d in cfg["documentos"]:
        if ids and d["id"] not in ids:
            continue
        destino = DIR_BRUTOS / f"{d['id']}.pdf"
        if destino.exists() and d.get("sha256") == hashlib.sha256(destino.read_bytes()).hexdigest():
            continue
        try:
            r = cli.obter(d["url"])
        except Exception as e:  # noqa: BLE001 - registra e segue para os demais
            d["erro"] = str(e)[:200]
            log(f"  {d['id']}: falha no download ({d['erro']})")
            continue
        if r.status_code != 200 or not r.content.startswith(b"%PDF"):
            d["erro"] = f"HTTP {r.status_code}, não é PDF"
            log(f"  {d['id']}: {d['erro']}")
            continue
        destino.write_bytes(r.content)
        novo = hashlib.sha256(r.content).hexdigest()
        if d.get("sha256") and d["sha256"] != novo:
            # Arquivo oficial mudou: a conferência anterior deixa de valer.
            d["conferido"] = False
            d.setdefault("alertas", []).append(f"arquivo_alterado_em:{agora_iso()[:10]}")
        d.update(sha256=novo, data_coleta=agora_iso(), bytes=len(r.content))
        d.pop("erro", None)
        log(f"  {d['id']}: {len(r.content) // 1024} KiB")
    salvar_config(cfg)


RE_NAVEGACAO = re.compile(r"Retornar ao sum[áa]rio|\|{5,}", re.I)
RE_INICIO_BLOCO = re.compile(r"^\s*(PARECER\s+JUR[ÍI]DICO|NOTA\s+T[ÉE]CNICA|\d+(\.\d+)+\.?\s+[A-ZÁÉÍÓÚ]"
                             r"|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ,:;–-]{10,}$)")
RE_PALAVRAS_CHAVE = re.compile(r"^\s*Palavras?-chaves?\s*:", re.I)


def linha_sem_conteudo(t: str) -> bool:
    """Elementos de diagramação e formulários: barras, links de navegação, "( ) Sim ( ) Não"."""
    if RE_NAVEGACAO.search(t) or "( )" in t:
        return True
    letras = sum(c.isalpha() for c in t)
    return len(t) > 5 and letras < 0.4 * len(t)


def segmentar_trechos(paginas: list[str]) -> list[dict]:
    """Trechos de texto corrido, sem atravessar páginas, sem cabeçalhos e rodapés repetidos.

    Cada trecho guarda os segmentos (página, início, fim) do texto canônico e é
    reconstruído por `texto_exibicao`, como as unidades das normas: a autoverificação
    de citacoes.verificar_unidades vale igualmente aqui.
    """
    por_pagina = linhas_de(paginas)
    excluir = linhas_repetitivas(por_pagina) | cabecalhos_de_capitulo(por_pagina)
    vocab = vocabulario(paginas)
    unidades = []
    for n, linhas in enumerate(por_pagina, start=1):
        if RE_PAGINA_EDITORIAL.search(paginas[n - 1]):
            continue
        uteis = [l for l in linhas if (l.pagina, l.inicio) not in excluir and not linha_sem_conteudo(l.texto)]
        grupo: list = []
        tamanho = 0

        def fechar():
            nonlocal grupo, tamanho
            if grupo:
                segs = []
                for l in grupo:
                    if segs and segs[-1][2] + 1 == l.inicio:
                        segs[-1][2] = l.fim
                    else:
                        segs.append([n, l.inicio, l.fim])
                texto = texto_exibicao(segs, paginas, vocab)
                if len(texto) >= 40 and sum(c.isalpha() for c in texto) > 0.5 * len(texto):
                    unidades.append({"pagina": n, "segmentos": segs, "texto": texto})
            grupo, tamanho = [], 0

        for l in uteis:
            # Título, parecer ou nota novos começam outro trecho (ementários juntam vários).
            if grupo and RE_INICIO_BLOCO.match(l.texto):
                fechar()
            grupo.append(l)
            tamanho += len(l.texto) + 1
            if (tamanho >= TAMANHO_MIN and RE_FIM_FRASE.search(l.texto)) or tamanho >= TAMANHO_MAX \
                    or RE_PALAVRAS_CHAVE.match(l.texto):
                fechar()
        fechar()
    contagem: dict[int, int] = {}
    for u in unidades:
        contagem[u["pagina"]] = contagem.get(u["pagina"], 0) + 1
        u["id"] = f"p{u['pagina']}-{contagem[u['pagina']]}"
    return unidades


def processar(ids: list[str] | None = None, log=print) -> None:
    cfg = carregar_config()
    DIR_TEXTOS.mkdir(parents=True, exist_ok=True)
    for d in cfg["documentos"]:
        if ids and d["id"] not in ids:
            continue
        caminho = DIR_BRUTOS / f"{d['id']}.pdf"
        if not caminho.exists() or not d.get("sha256"):
            continue
        if hashlib.sha256(caminho.read_bytes()).hexdigest() != d["sha256"]:
            raise RuntimeError(f"{d['id']}: arquivo local não corresponde ao SHA-256 registrado")
        paginas = extracao.extrair_pdf(caminho)
        qualidade = extracao.avaliar_qualidade(paginas)
        d["qualidade_extracao"] = qualidade["classificacao"]
        alertas = [a for a in d.get("alertas", []) if a.startswith("arquivo_alterado_em:")]
        if qualidade["classificacao"] in {"requer_ocr", "falhou"}:
            d["alertas"] = alertas + ["requer_ocr"]
            log(f"  {d['id']}: {qualidade['classificacao']} — fora do índice")
            continue
        unidades = segmentar_trechos(paginas)
        impressas = {}
        for n, linhas in enumerate(linhas_de(paginas), start=1):
            num = numero_impresso(linhas)
            if num:
                impressas[str(n)] = num
        texto_doc = {
            "documento_id": d["id"], "sha256": d["sha256"], "gerado_em": agora_iso(),
            "normalizacao": extracao.NORMALIZACAO,
            "paginas": [{"numero": i, "texto": t, "pagina_impressa": impressas.get(str(i))}
                        for i, t in enumerate(paginas, start=1)],
            "unidades": unidades,
        }
        erros = citacoes.verificar_unidades(texto_doc)
        if erros:
            raise RuntimeError(f"{d['id']}: {len(erros)} trechos não conferem com as páginas ({erros[0]})")
        injecao = extracao.detectar_injecao(paginas)
        if injecao:
            alertas.append(f"possivel_instrucao_embutida:{len(injecao)}")
        # Registro do que o próprio documento diz sobre reprodução (para a conferência).
        lic = RE_LICENCA.search("\n".join(paginas[:6] + paginas[-3:]))
        d["licenca_declarada"] = re.sub(r"\s+", " ", lic.group(0)).strip() if lic else None
        d["alertas"] = alertas
        d["paginas"] = len(paginas)
        d["trechos"] = len(unidades)
        (DIR_TEXTOS / f"{d['id']}.json").write_text(json.dumps(texto_doc, ensure_ascii=False), encoding="utf-8")
        log(f"  {d['id']}: {len(paginas)} p., {len(unidades)} trechos, qualidade {qualidade['classificacao']}"
            + (f", alertas: {', '.join(alertas)}" if alertas else ""))
    salvar_config(cfg)


def referencia_abnt(d: dict) -> str:
    """Referência (NBR 6023) sem a data de acesso, acrescentada pelo app."""
    ano = str(d["ano"]) if d.get("ano") else d.get("ano_texto", "[s. d.]")
    autor = d.get("autoria") or ORGAOS_ROTULO.get(d["orgao"]) or \
        f"CONSELHO REGIONAL DE SERVIÇO SOCIAL ({d['orgao']})"
    titulo = d["titulo"].rstrip(".")
    edicao = f" {d['edicao'].rstrip('.')}." if d.get("edicao") else ""
    local = LOCAL.get(d["orgao"], "[S. l.]")
    return f"{autor}. {titulo}.{edicao} {local}: {d['orgao']}, {ano}. Disponível em: {d['url']}."


def indexar(modo: str = "publico", log=print) -> dict:
    if modo not in ARQUIVOS:
        raise ValueError(modo)
    cfg = carregar_config()
    documentos, unidades = [], []
    for d in cfg["documentos"]:
        if modo == "publico" and not d.get("conferido"):
            continue
        caminho = DIR_TEXTOS / f"{d['id']}.json"
        if not caminho.exists() or d.get("qualidade_extracao") in {None, "requer_ocr", "falhou"}:
            continue
        texto = json.loads(caminho.read_text(encoding="utf-8"))
        if texto["sha256"] != d["sha256"] or citacoes.verificar_unidades(texto):
            log(f"  AVISO: {d['id']}: texto desatualizado ou não confere — fora do índice")
            continue
        if any(a.startswith("possivel_instrucao_embutida") for a in d.get("alertas", [])) and not d.get("conferido"):
            log(f"  AVISO: {d['id']}: possível instrução embutida — só entra depois da conferência")
            continue
        impressas = {p["numero"]: p.get("pagina_impressa") for p in texto["paginas"]}
        documentos.append({
            "id": d["id"], "camada": 2, "titulo": d["titulo"], "tipo": d["tipo"],
            "tipo_rotulo": TIPOS_DOCUMENTAIS[d["tipo"]] if d["tipo"] in TIPOS_DOCUMENTAIS else d["tipo"],
            "orgao": d["orgao"], "abrangencia": "nacional" if d["orgao"] in {"CFESS", "ABEPSS"} else f"regional:{d['orgao'][-2:]}",
            "numero": None, "ano": d.get("ano"), "edicao": d.get("edicao"), "autoria": d.get("autoria"),
            "situacao": "orientacao_institucional", "situacao_rotulo": "Orientação institucional (não é norma)",
            "assuntos": d.get("assuntos", []), "fonte_oficial_url": d.get("fonte_oficial_url") or d["url"],
            "arquivo_url": d["url"], "sha256": d["sha256"], "data_coleta": d.get("data_coleta"),
            "conferido": bool(d.get("conferido")),
            "conferencia": {"data": d["conferencia_data"]} if d.get("conferido") else None,
            "referencia": referencia_abnt(d), "partes": [], "alteracoes": {}, "indicacoes_portal": [],
        })
        for u in texto["unidades"]:
            unidades.append({
                "id": f"{d['id']}#{u['id']}", "doc": d["id"], "parte": d["titulo"], "parte_tipo": "orientativa",
                "tipo": "trecho", "rotulo": f"p. {u['pagina']}", "hierarquia": [], "pai": None,
                "pagina": u["pagina"], "pagina_fim": u["pagina"], "pagina_impressa": impressas.get(u["pagina"]),
                "texto": u["texto"],
            })
    conteudo = {"documentos": documentos, "unidades": unidades}
    saida = {
        "formato": 1, "camada": 2, "modo": modo, "gerado_em": agora_iso(),
        "aviso": "Orientações institucionais do CFESS, dos CRESS e da ABEPSS. Não são normas." +
                 ("" if modo == "publico" else " PRÉVIA INTERNA: documentos ainda NÃO conferidos. Não publicar."),
        "hash_conteudo": hashlib.sha256(json.dumps(conteudo, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
        **conteudo,
    }
    destino = catalogo.DIR_APP_DADOS / ARQUIVOS[modo]
    destino.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    log(f"  camada 2 ({modo}): {len(documentos)} documentos, {len(unidades)} trechos → {destino} "
        f"({destino.stat().st_size // 1024} KiB)")
    return {"documentos": len(documentos), "unidades": len(unidades)}


def registrar_conferencia(aprovados: list[str], rejeitados: list[str], data: str, log=print) -> None:
    cfg = carregar_config()
    for d in cfg["documentos"]:
        if d["id"] in aprovados:
            d["conferido"], d["conferencia_data"] = True, data
        elif d["id"] in rejeitados:
            d["conferido"], d["conferencia_data"] = False, data
            d["rejeitado"] = True
    salvar_config(cfg)
    log(f"  conferência registrada: {len(aprovados)} aprovados, {len(rejeitados)} rejeitados")


def ler_texto(id_: str) -> dict:
    return json.loads((DIR_TEXTOS / f"{id_}.json").read_text(encoding="utf-8"))

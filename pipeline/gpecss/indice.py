"""Geração dos índices consumidos pela aplicação web.

Dois modos:
  publico → apenas documentos `publicado` (conferidos por pessoa responsável);
  previa  → inclui também `aguardando_conferencia` e `aprovado`, marcados como
            NÃO CONFERIDOS. Destina-se a testes internos e nunca é implantado.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from . import catalogo, citacoes
from .esquema import ASSUNTOS, SITUACOES_NORMATIVAS, TIPOS_DOCUMENTAIS, agora_iso

ESTADOS_POR_MODO = {
    "publico": {"publicado"},
    "previa": {"aguardando_conferencia", "aprovado", "publicado"},
}

ARQUIVOS = {"publico": "acervo-publico.json", "previa": "acervo-previa.json"}

PARTES_NAO_PUBLICAS = {"apresentacao", "pre_textual"}


class ErroIntegridade(RuntimeError):
    pass


def _url_arquivo(reg: dict) -> str | None:
    principal = next((a for a in reg["arquivos"] if a["papel"] == "principal"), None)
    return principal["url"] if principal else None


def _verificar_arquivo_local(reg: dict) -> str:
    principal = next(a for a in reg["arquivos"] if a["papel"] in {"principal", "html_oficial"})
    caminho = catalogo.RAIZ / principal["caminho_local"]
    if not caminho.exists():
        return "arquivo_local_ausente"
    if hashlib.sha256(caminho.read_bytes()).hexdigest() != principal["sha256"]:
        raise ErroIntegridade(f"{reg['id']}: SHA-256 do arquivo local diverge do catálogo")
    return "ok"


def construir(modo: str = "publico", destino: Path | None = None, log=print) -> dict:
    if modo not in ESTADOS_POR_MODO:
        raise ValueError(f"modo inválido: {modo}")
    documentos, unidades, problemas = [], [], []
    for reg in catalogo.todos():
        if reg["estado_fluxo"] not in ESTADOS_POR_MODO[modo] or not reg.get("versao_atual"):
            continue
        texto = catalogo.carregar_texto(reg["id"], reg["versao_atual"])
        erros = citacoes.verificar_unidades(texto)
        if erros:
            problemas.append(f"{reg['id']}: {len(erros)} unidades não conferem — documento excluído")
            continue
        estado_arquivo = _verificar_arquivo_local(reg)
        conferido = reg["estado_fluxo"] in {"aprovado", "publicado"}
        impressas = {p["numero"]: p.get("pagina_impressa") for p in texto["paginas"]}
        documentos.append({
            "id": reg["id"],
            "titulo": reg["titulo_oficial"],
            "tipo": reg["tipo_documental"],
            "tipo_rotulo": TIPOS_DOCUMENTAIS[reg["tipo_documental"]],
            "orgao": reg["orgao_emissor"],
            "abrangencia": reg["abrangencia"],
            "numero": reg.get("numero"),
            "ano": reg.get("ano"),
            "ementa": reg.get("ementa"),
            "data_publicacao": reg.get("data_publicacao"),
            "inicio_vigencia": reg.get("inicio_vigencia"),
            "situacao": reg["situacao_normativa"],
            "situacao_rotulo": SITUACOES_NORMATIVAS[reg["situacao_normativa"]],
            "alteracoes": {k: v for k, v in reg["alteracoes"].items() if k != "mencoes_detectadas"},
            "assunto_principal": reg.get("assunto_principal"),
            "assuntos": [ASSUNTOS[a] for a in [reg.get("assunto_principal"), *reg.get("assuntos_secundarios", [])] if a],
            "fonte_oficial_url": reg["fonte_oficial_url"],
            "arquivo_url": _url_arquivo(reg),
            "redistribuicao": reg["redistribuicao"],
            "sha256": texto["sha256"],
            "versao": texto["versao"],
            "data_coleta": next((a["data_coleta"] for a in reg["arquivos"] if a["sha256"] == texto["sha256"]), None),
            "conferido": conferido,
            # Indicações de revogação/invalidade escritas no portal oficial, ainda não
            # conferidas: exibidas como alerta e usadas para reduzir o peso na busca.
            "indicacoes_portal": [a.split(":", 1)[1] for a in reg["alertas"] if a.startswith("portal_indica_situacao:")],
            # Só a data: o índice público não identifica quem conferiu (D19).
            "conferencia": {"data": reg["conferencia"].get("data")}
            if conferido else None,
            "partes": [{"slug": p["slug"], "rotulo": p["rotulo"], "tipo": p["tipo"],
                        "documento_relacionado": p.get("documento_relacionado")} for p in texto["partes"]],
            "arquivo_local": estado_arquivo,
        })
        partes = {p["rotulo"]: p for p in texto["partes"]}
        for u in texto["unidades"]:
            parte = partes.get(u["parte"], {})
            # Textos editoriais (apresentações, introduções) não são atos oficiais e podem ter
            # proteção autoral: ficam fora do índice público salvo autorização registrada.
            if modo == "publico" and parte.get("tipo") in PARTES_NAO_PUBLICAS \
                    and reg["redistribuicao"] != "pdf_republicavel":
                continue
            unidades.append({
                "id": f"{reg['id']}#{u['id']}",
                "doc": reg["id"],
                "parte": u["parte"],
                "parte_tipo": parte.get("tipo", "normativa"),
                "tipo": u["tipo"],
                "rotulo": u["rotulo"],
                "hierarquia": u["hierarquia"],
                "pai": f"{reg['id']}#{u['pai']}" if u["pai"] else None,
                "pagina": u["pagina_inicio"],
                "pagina_fim": u["pagina_fim"],
                "pagina_impressa": impressas.get(u["pagina_inicio"]),
                "texto": u["texto"],
            })
    conteudo = {"documentos": documentos, "unidades": unidades}
    hash_conteudo = hashlib.sha256(json.dumps(conteudo, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    saida = {
        "formato": 1,
        "modo": modo,
        "gerado_em": agora_iso(),
        "aviso": None if modo == "publico" else
        "PRÉVIA INTERNA: inclui documentos ainda NÃO conferidos por pessoa responsável. Não publicar.",
        "hash_conteudo": hash_conteudo,
        **conteudo,
    }
    destino = destino or catalogo.DIR_APP_DADOS / ARQUIVOS[modo]
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for p in problemas:
        log(f"  AVISO: {p}")
    log(f"  índice {modo}: {len(documentos)} documentos, {len(unidades)} unidades → {destino}")
    return {"documentos": len(documentos), "unidades": len(unidades), "problemas": problemas,
            "destino": str(destino), "bytes": destino.stat().st_size}

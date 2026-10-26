"""Leitura e gravação do catálogo (um arquivo JSON por documento)."""

from __future__ import annotations

import json
import os
from pathlib import Path

from .esquema import ErroEsquema, validar_registro

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / "dados"
DIR_CATALOGO = DADOS / "catalogo"
DIR_TEXTOS = DADOS / "textos"
DIR_BRUTOS = DADOS / "brutos"          # originais baixados (não versionados)
DIR_REGISTROS = DADOS / "registros"
DIR_APP_DADOS = RAIZ / "app" / "dados"


def _caminho(id_: str) -> Path:
    return DIR_CATALOGO / f"{id_}.json"


def existe(id_: str) -> bool:
    return _caminho(id_).exists()


def carregar(id_: str) -> dict:
    with open(_caminho(id_), encoding="utf-8") as f:
        return json.load(f)


def salvar(registro: dict) -> None:
    erros = validar_registro(registro)
    if erros:
        raise ErroEsquema(f"{registro.get('id')}: " + "; ".join(erros))
    DIR_CATALOGO.mkdir(parents=True, exist_ok=True)
    destino = _caminho(registro["id"])
    tmp = destino.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(registro, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, destino)


def todos() -> list[dict]:
    if not DIR_CATALOGO.exists():
        return []
    regs = []
    for p in sorted(DIR_CATALOGO.glob("*.json")):
        with open(p, encoding="utf-8") as f:
            regs.append(json.load(f))
    return regs


def por_url_fonte() -> dict[str, dict]:
    return {r["fonte_oficial_url"]: r for r in todos()}


def por_hash() -> dict[str, str]:
    """sha256 → id do documento que já contém aquele arquivo."""
    mapa = {}
    for r in todos():
        for a in r["arquivos"]:
            if a.get("sha256"):
                mapa.setdefault(a["sha256"], r["id"])
    return mapa


def registrar_evento(tipo: str, **dados) -> None:
    """Log de coleta em JSON Lines (rastreia mudanças de arquivos e endereços)."""
    from .esquema import agora_iso

    DIR_REGISTROS.mkdir(parents=True, exist_ok=True)
    with open(DIR_REGISTROS / "eventos.jsonl", "a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps({"data": agora_iso(), "tipo": tipo, **dados}, ensure_ascii=False) + "\n")


def caminho_texto(id_: str, versao: str) -> Path:
    return DIR_TEXTOS / id_ / f"{versao}.json"


def carregar_texto(id_: str, versao: str) -> dict:
    with open(caminho_texto(id_, versao), encoding="utf-8") as f:
        return json.load(f)


def salvar_texto(id_: str, versao: str, conteudo: dict) -> Path:
    destino = caminho_texto(id_, versao)
    destino.parent.mkdir(parents=True, exist_ok=True)
    with open(destino, "w", encoding="utf-8", newline="\n") as f:
        json.dump(conteudo, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return destino

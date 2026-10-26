"""Processamento: extração, segmentação, autoverificação e envio à fila de conferência."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from . import catalogo, citacoes, estrutura, extracao
from .esquema import agora_iso, transitar

DIR_PARTES = catalogo.DADOS / "configuracao" / "partes"

_RE_MENCAO = re.compile(
    r"(Resolu[çc][ãa]o\s+CFESS\s+n?[º°o.]?\s*\.?\s*(\d{1,4})\s*/\s*(\d{2,4})"
    r"|Lei\s+n?[º°o.]?\s*\.?\s*(\d{1,2}\.?\d{3})(?:\s*/\s*(\d{2,4})|,\s+de\s+\d{1,2}\s+de\s+\w+\s+de\s+(\d{4}))?)",
    re.I,
)


def _ano4(a: str | None) -> int | None:
    if not a:
        return None
    n = int(a)
    return n + (1900 if n >= 50 else 2000) if n < 100 else n


def detectar_mencoes(paginas: list[str]) -> list[dict]:
    """Normas mencionadas no texto, com indício de relação (altera/revoga).

    É apenas um apoio à conferência: nenhuma situação normativa é alterada
    automaticamente a partir destas menções.
    """
    vistas: dict[str, dict] = {}
    for n, texto in enumerate(paginas, start=1):
        plano = re.sub(r"\s+", " ", texto)
        for m in _RE_MENCAO.finditer(plano):
            if m.group(2):
                chave = f"cfess-resolucao-{int(m.group(2))}-{_ano4(m.group(3))}"
            else:
                chave = f"lei-{m.group(4).replace('.', '')}" + (
                    f"-{_ano4(m.group(5) or m.group(6))}" if (m.group(5) or m.group(6)) else "")
            contexto = plano[max(0, m.start() - 90): m.end() + 30]
            rel = "mencao"
            if re.search(r"revog", contexto, re.I):
                rel = "possivel_revogacao"
            elif re.search(r"alter|acresc|nova reda[çc][ãa]o", contexto, re.I):
                rel = "possivel_alteracao"
            item = vistas.setdefault(chave, {"referencia": chave, "texto": m.group(0), "relacoes": set(), "paginas": set()})
            item["relacoes"].add(rel)
            item["paginas"].add(n)
    return [{"referencia": v["referencia"], "texto": v["texto"], "relacoes": sorted(v["relacoes"]),
             "paginas": sorted(v["paginas"])} for v in vistas.values()]


def carregar_partes_manuais(doc_id: str, sha256: str) -> tuple[list[dict] | None, str | None]:
    caminho = DIR_PARTES / f"{doc_id}.json"
    if not caminho.exists():
        return None, None
    cfg = json.loads(caminho.read_text(encoding="utf-8"))
    if cfg.get("sha256") != sha256:
        return None, "mapa_de_partes_desatualizado"
    return cfg["partes"], None


def _versao_extrator() -> str:
    try:
        import pypdfium2

        return f"pypdfium2 {pypdfium2.version.PYPDFIUM_INFO}"
    except Exception:  # noqa: BLE001 - apenas informativo
        return "pypdfium2"


def processar(doc_id: str, log=print) -> dict:
    reg = catalogo.carregar(doc_id)
    if reg["estado_fluxo"] not in {"baixado", "processado", "erro_extracao"}:
        raise RuntimeError(f"{doc_id}: estado {reg['estado_fluxo']} não permite processamento")
    principal = next((a for a in reg["arquivos"] if a["papel"] in {"principal", "html_oficial"}), None)
    if not principal:
        raise RuntimeError(f"{doc_id}: sem arquivo principal")
    caminho = catalogo.RAIZ / principal["caminho_local"]
    conteudo = caminho.read_bytes()
    if hashlib.sha256(conteudo).hexdigest() != principal["sha256"]:
        raise RuntimeError(f"{doc_id}: arquivo local não corresponde ao SHA-256 registrado")

    if principal["tipo_mime"] == "application/pdf":
        paginas = extracao.extrair_pdf(caminho)
        extrator = _versao_extrator()
    else:
        paginas = extracao.extrair_html_planalto(conteudo)
        extrator = "beautifulsoup4 (HTML do Planalto; trechos riscados removidos)"
    qualidade = extracao.avaliar_qualidade(paginas)
    reg["qualidade_extracao"] = qualidade
    alertas = [a for a in reg["alertas"] if not a.startswith(("possivel_instrucao_embutida", "mapa_de_partes", "partes_detectadas", "anexo_ou_compilacao"))]
    if qualidade["classificacao"] in {"requer_ocr", "falhou"}:
        if reg["estado_fluxo"] != "erro_extracao":
            transitar(reg, "erro_extracao", "processador", qualidade.get("motivo", "extração insuficiente"))
        reg["alertas"] = alertas + ["requer_ocr"]
        catalogo.salvar(reg)
        log(f"  {doc_id}: extração insuficiente ({qualidade['classificacao']}) — mantido pendente")
        return {"estado": reg["estado_fluxo"], "qualidade": qualidade}

    partes_manuais, alerta_partes = carregar_partes_manuais(doc_id, principal["sha256"])
    if alerta_partes:
        alertas.append(alerta_partes)
    seg = estrutura.segmentar(paginas, doc_id, partes_manuais)
    if not partes_manuais:
        # A parte principal recebe o título oficial do documento.
        for p in seg["partes"]:
            if p["rotulo"] == "Texto":
                p["rotulo"] = reg["titulo_oficial"]
        for u in seg["unidades"]:
            if u["parte"] == "Texto":
                u["parte"] = reg["titulo_oficial"]
                if u["tipo"] in {"trecho", "apresentacao"}:
                    u["rotulo"] = u["rotulo"].replace("Texto — ", f"{reg['titulo_oficial']} — ", 1)
    texto_doc = {
        "documento_id": doc_id,
        "sha256": principal["sha256"],
        "versao": principal["versao"],
        "gerado_em": agora_iso(),
        "extrator": extrator,
        "normalizacao": extracao.NORMALIZACAO,
        "partes_origem": "manual" if partes_manuais else "automatica",
        "paginas": [{"numero": i, "texto": t, "pagina_impressa": seg["paginas_impressas"].get(str(i))}
                    for i, t in enumerate(paginas, start=1)],
        "partes": seg["partes"],
        "unidades": seg["unidades"],
    }
    erros = citacoes.verificar_unidades(texto_doc)
    if erros:
        transitar(reg, "erro_extracao", "processador", f"autoverificação falhou: {erros[0]}")
        catalogo.salvar(reg)
        raise RuntimeError(f"{doc_id}: {len(erros)} unidades não conferem com as páginas")
    catalogo.salvar_texto(doc_id, principal["versao"], texto_doc)

    injecao = extracao.detectar_injecao(paginas)
    if injecao:
        alertas.append(f"possivel_instrucao_embutida:{len(injecao)}")
        reg["injecao_detectada"] = injecao[:20]
    if not partes_manuais and len(seg["partes"]) > 1:
        alertas.append("anexo_ou_compilacao_detectado")
    reg["alertas"] = sorted(set(alertas))
    reg["alteracoes"]["mencoes_detectadas"] = detectar_mencoes(paginas)
    reg["versao_atual"] = principal["versao"]
    reg["indexacao"] = {
        "paginas": len(paginas),
        "paginas_indexadas": sorted({p for u in seg["unidades"] for p in range(u["pagina_inicio"], u["pagina_fim"] + 1)}),
        "dispositivos": sum(1 for u in seg["unidades"] if u["tipo"] not in {"trecho", "apresentacao"}),
        "unidades": len(seg["unidades"]),
        "partes": [{"slug": p["slug"], "rotulo": p["rotulo"], "tipo": p["tipo"]} for p in seg["partes"]],
    }
    if reg["estado_fluxo"] in {"baixado", "erro_extracao"}:
        transitar(reg, "processado", "processador", f"{len(seg['unidades'])} unidades extraídas")
    transitar(reg, "aguardando_conferencia", "processador", "pronto para conferência humana")
    catalogo.salvar(reg)
    catalogo.registrar_evento("processado", id=doc_id, unidades=len(seg["unidades"]),
                              qualidade=qualidade["classificacao"])
    log(f"  {doc_id}: {len(seg['unidades'])} unidades, qualidade {qualidade['classificacao']}, "
        f"alertas: {', '.join(reg['alertas']) or 'nenhum'}")
    return {"estado": reg["estado_fluxo"], "unidades": len(seg["unidades"]), "qualidade": qualidade}


def salvar_mapa_partes(doc_id: str, partes: list[dict], sha256: str, autor: str) -> Path:
    DIR_PARTES.mkdir(parents=True, exist_ok=True)
    caminho = DIR_PARTES / f"{doc_id}.json"
    caminho.write_text(json.dumps({"documento_id": doc_id, "sha256": sha256, "autor": autor,
                                   "registrado_em": agora_iso(), "partes": partes},
                                  ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return caminho

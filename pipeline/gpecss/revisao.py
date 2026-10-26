"""Fila de conferência humana.

Somente pessoas aprovam, rejeitam ou publicam documentos. Cada decisão exige
o nome (ou identificador) da pessoa responsável e fica registrada no histórico.
"""

from __future__ import annotations

from datetime import date

from . import catalogo
from .esquema import ASSUNTOS, SITUACOES_NORMATIVAS, TransicaoInvalida, agora_iso, transitar

ORDEM_FILA = ["aguardando_conferencia", "erro_extracao", "processado", "baixado", "descoberto",
              "erro_download", "aprovado", "publicado", "rejeitado", "fora_do_escopo"]

LISTA_CONFERENCIA = [
    "O arquivo corresponde ao documento oficial indicado na página do órgão emissor?",
    "Título, número, ano, órgão e tipo documental estão corretos?",
    "A situação normativa (vigente, alterada, revogada, histórica) foi verificada em fonte oficial?",
    "Alterações e revogações relacionadas foram registradas?",
    "A divisão em partes e dispositivos (artigos, parágrafos, incisos, alíneas) está correta?",
    "Os trechos de amostra correspondem ao PDF original nas páginas indicadas?",
    "Os alertas automáticos (escopo, OCR, instruções embutidas, duplicatas) foram resolvidos?",
    "A redistribuição do arquivo é permitida ou deve ficar apenas o link oficial?",
]


def _validar_responsavel(responsavel: str) -> str:
    r = (responsavel or "").strip()
    if len(r) < 3:
        raise TransicaoInvalida("informe o nome ou identificador da pessoa responsável pela conferência")
    if r.lower().startswith(("coletor", "processador", "indexador", "automatico", "claude", "ia", "llm")):
        raise TransicaoInvalida("a conferência deve ser feita por uma pessoa")
    return r


def fila(estados: list[str] | None = None) -> list[dict]:
    regs = catalogo.todos()
    if estados:
        regs = [r for r in regs if r["estado_fluxo"] in estados]
    return sorted(regs, key=lambda r: (ORDEM_FILA.index(r["estado_fluxo"]), r["id"]))


def resumo_documento(doc_id: str, amostras: int = 6) -> str:
    r = catalogo.carregar(doc_id)
    linhas = [
        f"ID: {r['id']}",
        f"Título oficial: {r['titulo_oficial']}",
        f"Tipo: {r['tipo_documental']} | Nº {r.get('numero') or '—'} | Ano {r.get('ano') or '—'} | Órgão: {r['orgao_emissor']}",
        f"Situação normativa: {SITUACOES_NORMATIVAS[r['situacao_normativa']]}",
        f"Estado: {r['estado_fluxo']}",
        f"Página oficial: {r['fonte_oficial_url']}",
    ]
    for a in r["arquivos"]:
        linhas.append(f"Arquivo ({a['papel']}): {a['url']}  sha256={a['sha256']}  {a['bytes']:,} bytes")
    if r.get("ementa"):
        linhas.append(f"Ementa (página oficial): {r['ementa'][:400]}")
    q = r.get("qualidade_extracao")
    if q:
        linhas.append(f"Qualidade da extração: {q['classificacao']} — {q.get('paginas')} páginas, "
                      f"{q.get('paginas_sem_texto')} sem texto")
    if r["alertas"]:
        linhas.append("ALERTAS: " + "; ".join(r["alertas"]))
    for inj in r.get("injecao_detectada", [])[:5]:
        linhas.append(f"  possível instrução embutida (p. {inj['pagina']}): …{inj['trecho']}…")
    mencoes = r["alteracoes"].get("mencoes_detectadas") or []
    if mencoes:
        linhas.append("Normas mencionadas (detecção automática, não confirmada):")
        for m in mencoes[:15]:
            linhas.append(f"  - {m['texto']} → {m['referencia']} [{', '.join(m['relacoes'])}] p. {m['paginas']}")
    if r.get("versao_atual"):
        texto = catalogo.carregar_texto(r["id"], r["versao_atual"])
        linhas.append(f"Partes ({texto['partes_origem']}):")
        for p in texto["partes"]:
            linhas.append(f"  - {p['rotulo']} [{p['tipo']}] pp. {p['pagina_inicio']}–{p.get('pagina_fim')}")
        unidades = texto["unidades"]
        passo = max(1, len(unidades) // amostras)
        linhas.append(f"Amostra de {min(amostras, len(unidades))} de {len(unidades)} unidades (conferir no PDF):")
        for u in unidades[::passo][:amostras]:
            linhas.append(f"  [{u['rotulo']} — {u['parte']} — p. {u['pagina_inicio']}] {u['texto'][:220]}")
    linhas.append("Lista de conferência:")
    linhas.extend(f"  [ ] {item}" for item in LISTA_CONFERENCIA)
    return "\n".join(linhas)


def aprovar(doc_id: str, responsavel: str, situacao: str, assunto_principal: str | None = None,
            assuntos_secundarios: list[str] | None = None, observacoes: str | None = None,
            redistribuicao: str | None = None) -> dict:
    responsavel = _validar_responsavel(responsavel)
    if situacao not in SITUACOES_NORMATIVAS:
        raise TransicaoInvalida(f"situação normativa inválida: {situacao}")
    for a in [assunto_principal, *(assuntos_secundarios or [])]:
        if a is not None and a not in ASSUNTOS:
            raise TransicaoInvalida(f"assunto inválido: {a}")
    r = catalogo.carregar(doc_id)
    bloqueantes = [a for a in r["alertas"] if a.startswith(("requer_ocr", "mapa_de_partes_desatualizado"))]
    if bloqueantes:
        raise TransicaoInvalida(f"resolva antes os alertas: {', '.join(bloqueantes)}")
    r["situacao_normativa"] = situacao
    if assunto_principal:
        r["assunto_principal"] = assunto_principal
    if assuntos_secundarios is not None:
        r["assuntos_secundarios"] = assuntos_secundarios
    if redistribuicao:
        r["redistribuicao"] = redistribuicao
    r["conferencia"] = {"data": date.today().isoformat(), "responsavel": responsavel,
                        "observacoes": observacoes, "versao_conferida": r.get("versao_atual"),
                        "registrado_em": agora_iso()}
    transitar(r, "aprovado", responsavel, observacoes or "conferência concluída")
    catalogo.salvar(r)
    catalogo.registrar_evento("aprovado", id=doc_id, por=responsavel)
    return r


def rejeitar(doc_id: str, responsavel: str, motivo: str, fora_do_escopo: bool = False) -> dict:
    responsavel = _validar_responsavel(responsavel)
    if not motivo or len(motivo.strip()) < 5:
        raise TransicaoInvalida("informe o motivo")
    r = catalogo.carregar(doc_id)
    transitar(r, "fora_do_escopo" if fora_do_escopo else "rejeitado", responsavel, motivo)
    catalogo.salvar(r)
    catalogo.registrar_evento("fora_do_escopo" if fora_do_escopo else "rejeitado", id=doc_id, por=responsavel)
    return r


def publicar(doc_id: str, responsavel: str) -> dict:
    responsavel = _validar_responsavel(responsavel)
    r = catalogo.carregar(doc_id)
    if r["conferencia"].get("versao_conferida") != r.get("versao_atual"):
        raise TransicaoInvalida("a versão conferida difere da versão atual do texto; reconfira")
    transitar(r, "publicado", responsavel, "incluído no acervo público")
    catalogo.salvar(r)
    catalogo.registrar_evento("publicado", id=doc_id, por=responsavel)
    return r

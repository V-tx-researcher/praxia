"""Esquema de metadados, vocabulários controlados e máquina de estados do acervo.

Este módulo é a fonte única dos valores aceitos nos registros do catálogo.
Qualquer valor fora destas listas é rejeitado por `validar_registro`.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timezone

VERSAO_ESQUEMA = 1

TIPOS_DOCUMENTAIS = {
    "lei": "Lei",
    "decreto": "Decreto",
    "codigo_etica": "Código de Ética",
    "resolucao": "Resolução",
    "portaria": "Portaria",
    "orientacao_normativa": "Orientação normativa",
    "parecer_juridico": "Parecer jurídico",
    "parecer_tecnico": "Parecer técnico",
    "nota_tecnica": "Nota técnica",
    "politica_institucional": "Política institucional",
    "documento_orientativo": "Documento orientativo",
    "outro": "Outro",
}

UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]

# Órgãos emissores. Os CRESS são identificados pela UF (ex.: "CRESS-SP").
# A numeração regional (ex.: 9ª Região) é registrada em observações, não aqui,
# porque não deve ser inferida sem verificação.
ORGAOS = {"CFESS", "Presidência da República", "Congresso Nacional"} | {f"CRESS-{uf}" for uf in UFS}

ABRANGENCIAS = {"nacional"} | {f"regional:{uf}" for uf in UFS}

ASSUNTOS = {
    "sigilo_profissional": "Sigilo profissional",
    "atribuicoes_privativas": "Atribuições privativas",
    "competencias": "Competências profissionais",
    "condicoes_eticas_tecnicas": "Condições éticas e técnicas de trabalho",
    "supervisao_estagio": "Supervisão de estágio",
    "direitos_profissionais": "Direitos profissionais",
    "deveres_profissionais": "Deveres profissionais",
    "vedacoes": "Vedações",
    "autonomia_profissional": "Autonomia profissional",
    "relacoes_profissionais": "Relações com outros profissionais e instituições",
    "relacao_usuarios": "Relação com usuários/as",
    "documentos_tecnicos": "Documentos técnicos (estudos, laudos, pareceres)",
    "fiscalizacao_profissional": "Fiscalização profissional",
    "processo_etico": "Processo ético e penalidades",
    "registro_inscricao": "Registro e inscrição",
    "exercicio_profissional": "Exercício profissional (geral)",
    "formacao_profissional": "Formação profissional",
    "outro": "Outro",
}

SITUACOES_NORMATIVAS = {
    "vigente_confirmada": "Vigente (confirmada)",
    "alterada": "Vigente com alterações",
    "revogada": "Revogada",
    "historica": "Edição histórica",
    "nao_verificada": "Vigência ainda não verificada",
}

QUALIDADES_EXTRACAO = {
    "boa": "Texto extraído com boa qualidade",
    "parcial": "Extração parcial — conferir",
    "requer_ocr": "Documento digitalizado — requer OCR",
    "falhou": "Extração falhou",
}

# Política de redistribuição: o padrão conservador é publicar apenas o link
# oficial e os excertos necessários às citações (ver docs/DOCUMENT_POLICY.md).
REDISTRIBUICAO = {"link_e_excertos", "pdf_republicavel", "nao_avaliada"}

ESTADOS = {
    "descoberto", "baixado", "processado", "aguardando_conferencia",
    "aprovado", "publicado",
    "erro_download", "erro_extracao", "rejeitado", "fora_do_escopo",
}

# Transições permitidas. Somente pessoas (comando `revisar`) movem para
# aprovado/rejeitado/fora_do_escopo; a automação nunca aprova.
TRANSICOES = {
    "descoberto": {"baixado", "erro_download", "fora_do_escopo", "rejeitado"},
    "baixado": {"processado", "erro_extracao", "baixado", "rejeitado", "fora_do_escopo"},
    "processado": {"aguardando_conferencia", "processado", "erro_extracao", "baixado"},
    "aguardando_conferencia": {"aprovado", "rejeitado", "fora_do_escopo", "processado", "baixado"},
    "aprovado": {"publicado", "aguardando_conferencia", "processado", "baixado"},
    "publicado": {"aguardando_conferencia", "processado", "baixado"},
    "erro_download": {"descoberto", "baixado", "rejeitado"},
    "erro_extracao": {"processado", "baixado", "rejeitado"},
    "rejeitado": {"aguardando_conferencia", "descoberto"},
    "fora_do_escopo": {"descoberto", "aguardando_conferencia"},
}

TRANSICOES_HUMANAS = {"aprovado", "publicado", "rejeitado", "fora_do_escopo"}

PAPEIS_ARQUIVO = {"principal", "anexo", "edicao_historica", "html_oficial"}

# Situação de um dispositivo específico (registrada na conferência humana, com
# fonte oficial verificada) — campo opcional `dispositivos_afetados`.
SITUACOES_DISPOSITIVO = {
    "revogado": "Dispositivo revogado",
    "alterado": "Dispositivo com redação alterada",
    "vigente_com_ressalva": "Dispositivo vigente, com ressalva",
}

CAMPOS_OBRIGATORIOS = [
    "id", "versao_esquema", "titulo_oficial", "orgao_emissor", "tipo_documental",
    "abrangencia", "situacao_normativa", "fonte_oficial_url", "estado_fluxo",
    "historico_estados", "arquivos", "redistribuicao", "alteracoes", "conferencia",
]

_RE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ErroEsquema(ValueError):
    pass


class TransicaoInvalida(ValueError):
    pass


def agora_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def registro_vazio(id_: str, titulo: str, fonte_url: str) -> dict:
    return {
        "id": id_,
        "versao_esquema": VERSAO_ESQUEMA,
        "titulo_oficial": titulo,
        "numero": None,
        "ano": None,
        "orgao_emissor": "CFESS",
        "tipo_documental": "outro",
        "abrangencia": "nacional",
        "assunto_principal": None,
        "assuntos_secundarios": [],
        "ementa": None,
        "data_publicacao": None,
        "inicio_vigencia": None,
        "situacao_normativa": "nao_verificada",
        "alteracoes": {
            "altera": [], "revoga": [], "alterado_por": [], "revogado_por": [],
            "mencoes_detectadas": [],
        },
        "fonte_oficial_url": fonte_url,
        "categoria_portal": None,
        "arquivos": [],
        "versao_atual": None,
        "redistribuicao": "link_e_excertos",
        "conferencia": {"data": None, "responsavel": None, "observacoes": None},
        "indexacao": {"paginas": 0, "dispositivos": 0},
        "qualidade_extracao": None,
        "alertas": [],
        "estado_fluxo": "descoberto",
        "historico_estados": [{"de": None, "para": "descoberto", "data": agora_iso(),
                               "por": "coletor", "motivo": "descoberta inicial"}],
    }


def transitar(registro: dict, novo_estado: str, por: str, motivo: str = "") -> dict:
    atual = registro["estado_fluxo"]
    if novo_estado not in ESTADOS:
        raise TransicaoInvalida(f"estado desconhecido: {novo_estado}")
    if novo_estado not in TRANSICOES.get(atual, set()):
        raise TransicaoInvalida(f"transição não permitida: {atual} → {novo_estado}")
    if novo_estado in TRANSICOES_HUMANAS and por.startswith(("coletor", "processador", "indexador", "automatico")):
        raise TransicaoInvalida(f"'{novo_estado}' exige conferência humana")
    if novo_estado == "aprovado":
        conf = registro.get("conferencia") or {}
        if not conf.get("responsavel") or not conf.get("data"):
            raise TransicaoInvalida("aprovação exige responsável e data de conferência")
    registro["estado_fluxo"] = novo_estado
    registro["historico_estados"].append(
        {"de": atual, "para": novo_estado, "data": agora_iso(), "por": por, "motivo": motivo}
    )
    return registro


def _data_ok(valor) -> bool:
    if valor is None:
        return True
    try:
        date.fromisoformat(valor)
        return True
    except (TypeError, ValueError):
        return False


def validar_registro(r: dict) -> list[str]:
    """Retorna a lista de problemas encontrados (vazia se o registro é válido)."""
    erros = []
    for campo in CAMPOS_OBRIGATORIOS:
        if campo not in r:
            erros.append(f"campo obrigatório ausente: {campo}")
    if erros:
        return erros
    if not _RE_ID.match(r["id"]):
        erros.append(f"id inválido: {r['id']!r}")
    if r["orgao_emissor"] not in ORGAOS:
        erros.append(f"órgão emissor fora do vocabulário: {r['orgao_emissor']!r}")
    if r["tipo_documental"] not in TIPOS_DOCUMENTAIS:
        erros.append(f"tipo documental fora do vocabulário: {r['tipo_documental']!r}")
    if r["abrangencia"] not in ABRANGENCIAS:
        erros.append(f"abrangência fora do vocabulário: {r['abrangencia']!r}")
    if r["situacao_normativa"] not in SITUACOES_NORMATIVAS:
        erros.append(f"situação normativa fora do vocabulário: {r['situacao_normativa']!r}")
    if r["estado_fluxo"] not in ESTADOS:
        erros.append(f"estado fora do vocabulário: {r['estado_fluxo']!r}")
    if r["redistribuicao"] not in REDISTRIBUICAO:
        erros.append(f"redistribuição fora do vocabulário: {r['redistribuicao']!r}")
    for a in [r.get("assunto_principal")] + list(r.get("assuntos_secundarios") or []):
        if a is not None and a not in ASSUNTOS:
            erros.append(f"assunto fora do vocabulário: {a!r}")
    q = r.get("qualidade_extracao")
    if q is not None and q.get("classificacao") not in QUALIDADES_EXTRACAO:
        erros.append("qualidade de extração fora do vocabulário")
    for campo in ("data_publicacao", "inicio_vigencia"):
        if not _data_ok(r.get(campo)):
            erros.append(f"data inválida em {campo}: {r.get(campo)!r}")
    for arq in r["arquivos"]:
        if arq.get("papel") not in PAPEIS_ARQUIVO:
            erros.append(f"papel de arquivo inválido: {arq.get('papel')!r}")
        if arq.get("sha256") and not re.fullmatch(r"[0-9a-f]{64}", arq["sha256"]):
            erros.append("sha256 malformado")
    if r["estado_fluxo"] in {"aprovado", "publicado"}:
        if not r["conferencia"].get("responsavel"):
            erros.append("documento aprovado sem responsável pela conferência")
        if not r.get("versao_atual"):
            erros.append("documento aprovado sem versão de texto processada")
        if (r.get("qualidade_extracao") or {}).get("classificacao") in {"requer_ocr", "falhou"}:
            erros.append("documento aprovado com extração insuficiente")
    for d in r.get("dispositivos_afetados") or []:
        if d.get("situacao") not in SITUACOES_DISPOSITIVO:
            erros.append(f"situação de dispositivo inválida: {d.get('situacao')!r}")
        if not d.get("unidade") or not d.get("nota") or not d.get("fontes"):
            erros.append("dispositivo afetado sem unidade, nota ou fontes oficiais")
    # Sequência do histórico deve ser coerente com as transições permitidas.
    hist = r["historico_estados"]
    for anterior, seguinte in zip(hist, hist[1:]):
        if seguinte["de"] != anterior["para"]:
            erros.append("histórico de estados descontínuo")
            break
    if hist and hist[-1]["para"] != r["estado_fluxo"]:
        erros.append("estado atual diverge do histórico")
    return erros

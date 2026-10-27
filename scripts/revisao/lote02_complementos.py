"""Complementa o lote 2 com relações já conhecidas e a pendência da Res. 954/2020.

Uso (na raiz), depois de preparar_lote.py: python scripts/revisao/lote02_complementos.py
"""

import json
from pathlib import Path

ARQ = Path(__file__).resolve().parents[2] / "dados" / "configuracao" / "lotes" / "lote-02.json"

RELACOES = {
    "cfess-resolucao-660-2013": [
        "Revoga integralmente a Res. 428/2002 (Art. 2º — conferido).",
        "Segundo as ementas do portal, foi alterada ou complementada pelas Res. 938/2020 (prescrição e prazos) e 1.013/2022 "
        "(falecimento da pessoa denunciada); a Res. 988/2022 trata dos atos eletrônicos dos processos.",
        "O PDF tem trechos riscados (redação revogada), retirados pelo sistema."],
    "cfess-resolucao-657-2013-p663": [
        "Versão compilada publicada pelo CFESS (o texto original e a errata também estão no portal).",
        "A Res. 988/2022 trata dos atos eletrônicos dos processos (ementa do portal)."],
    "cfess-resolucao-1073-2024": ["Revoga integralmente a Res. 443/2003, incorporando seu texto com alterações (Art. 13 — conferido)."],
    "cfess-resolucao-934-2020": ["A Res. 950/2020 acrescentou parágrafo único ao Art. 9º desta resolução (ementa do portal)."],
    "cfess-resolucao-950-2020": ["Acrescenta parágrafo único ao Art. 9º da Res. 934/2020 (ementa do portal)."],
    "cfess-resolucao-952-2020": ["Regulamenta o Art. 26 do Código de Ética (antecedentes profissionais)."],
    "cfess-resolucao-1054-2023": ["Regulamenta os princípios II, VI e XI do Código de Ética (ementa do portal)."],
    "cfess-resolucao-992-2022": ["Regulamenta os princípios II, VI e XI do Código de Ética (ementa do portal)."],
}

PENDENCIA_954 = {
    "id": "cfess-resolucao-954-2020",
    "titulo": "Resolução nº 954/2020 (pendência do lote 1)",
    "pdf": "https://www.cfess.org.br/uploads/legislacao/4406/ResolucaoCfess954-2020.pdf",
    "pagina_oficial": "https://www.cfess.org.br/legislacao/view/331/resolucao-n-9542020",
    "somente_pedido": True,
    "pedido_extra": ("Para publicar esta resolução falta o Art. 1º (p. 2 do PDF), que a leitura automática "
                     "estragou no trecho entre parênteses. Copie abaixo o Art. 1º inteiro, exatamente como está no PDF."),
}

d = json.loads(ARQ.read_text(encoding="utf-8"))
for x in d["documentos"]:
    x["relacoes_conhecidas"] = RELACOES.get(x["id"], [])
d["documentos"].append(PENDENCIA_954)
ARQ.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("ok", len(d["documentos"]))

"""Complementa o lote 1 com relações já conhecidas e pedidos específicos.

Uso (na raiz), depois de preparar_lote.py: python scripts/revisao/lote01_complementos.py
"""

import json
from pathlib import Path

ARQ = Path(__file__).resolve().parents[2] / "dados" / "configuracao" / "lotes" / "lote-01.json"

RELACOES = {
    "cfess-resolucao-1114-2025": ["O portal indica que ela revogou integralmente a Res. 493/2006."],
    "cfess-resolucao-1098-2025": ["O portal indica que ela revogou integralmente a Res. 556/2009."],
    "cfess-resolucao-512-2007": ["A Res. 828/2017 altera dispositivos desta resolução (ementa do portal). "
                                 "O PDF é uma versão com trechos riscados."],
    "cfess-resolucao-954-2020": [
        "A Res. 970/2021 anulou o Art. 1º desta resolução quanto à alínea c do Art. 22 do Código e deu nova "
        "redação aos Arts. 1º e 3º (conferido no texto oficial).",
        "O portal publica também uma versão compilada desta resolução, mas a leitura automática dela saiu "
        "ilegível; por isso a conferência é feita no texto original."],
    "cfess-resolucao-970-2021": ["Altera a Res. 954/2020 e restabelece a alínea c do Art. 22 do Código de Ética "
                                 "(conferido no texto oficial)."],
    "cfess-resolucao-594-2011": ["Altera o Código de Ética; as alterações já estão incorporadas na 10ª edição do "
                                 "Código (conferência nº 1)."],
}
PEDIDOS = {
    "cfess-resolucao-954-2020": ("O Art. 3º (p. 2 do PDF) perdeu partes do texto na leitura automática. Copie abaixo "
                                 "os incisos III e IV como estão no PDF (o inciso I você já transcreveu na Atividade nº 1)."),
}

d = json.loads(ARQ.read_text(encoding="utf-8"))
for x in d["documentos"]:
    x["relacoes_conhecidas"] = RELACOES.get(x["id"], [])
    if x["id"] in PEDIDOS:
        x["pedido_extra"] = PEDIDOS[x["id"]]
ARQ.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("ok")

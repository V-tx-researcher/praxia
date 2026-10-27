"""Registra a triagem do acervo aprovada pelo revisor (Atividade nº 2, 27/10/2026).

O revisor aprovou a proposta (grupos 1, 2 e 5) e delegou ao desenvolvimento a
decisão sobre o grupo 3 ("dúvida"), registrada abaixo. Normas excluídas passam a
`fora_do_escopo` (reversível); as incluídas seguem para download e processamento.

Uso (na raiz): python scripts/revisao/registrar_triagem.py
"""

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402
from gpecss.esquema import transitar  # noqa: E402

RESPONSAVEL = "revisao-profissional"
DUVIDA_INCLUIR = {
    "cfess-resolucao-418-2001", "cfess-resolucao-467-2005", "cfess-resolucao-560-2009",
    "cfess-resolucao-707-2015", "cfess-resolucao-950-2020", "cfess-resolucao-988-2022",
    "cfess-resolucao-1015-2022",
}

caminho = RAIZ / "dados" / "configuracao" / "triagem.json"
t = json.loads(caminho.read_text(encoding="utf-8"))
incluidas = set(t["incluir"]) | set(t["historicas"]) | DUVIDA_INCLUIR
excluidas = (set(t["duvida"]) - DUVIDA_INCLUIR) | set(t["excluir"])
t["situacao"] = ("APROVADA pelo revisor em 27/10/2026 (Atividade nº 2): grupos 1, 2 e 5 como propostos; "
                 "grupo 3 decidido pelo desenvolvimento por delegação do revisor.")
t["decisao"] = {"incluidas": sorted(incluidas), "excluidas": sorted(excluidas),
                "duvida_incluidas": sorted(DUVIDA_INCLUIR)}
caminho.write_text(json.dumps(t, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

mudou = 0
for id_ in sorted(excluidas):
    r = catalogo.carregar(id_)
    if r["estado_fluxo"] == "descoberto":
        transitar(r, "fora_do_escopo", RESPONSAVEL, "Triagem do acervo (Atividade nº 2): sem impacto no exercício profissional")
        catalogo.salvar(r)
        mudou += 1
for r in catalogo.todos():
    if r["tipo_documental"] == "portaria" and r["estado_fluxo"] == "descoberto":
        transitar(r, "fora_do_escopo", RESPONSAVEL, "Triagem do acervo (Atividade nº 2): portaria administrativa")
        catalogo.salvar(r)
        mudou += 1
print(f"incluídas: {len(incluidas)} | marcadas fora do escopo: {mudou}")
pendentes = sorted(i for i in incluidas if catalogo.carregar(i)["estado_fluxo"] == "descoberto")
(RAIZ / "dados" / "configuracao" / "a_baixar.txt").write_text("\n".join(pendentes) + "\n", encoding="utf-8")
print(f"a baixar: {len(pendentes)}")

"""Reprocessamento técnico de documentos já conferidos e publicados.

Usado quando uma melhoria do processamento muda o texto extraído SEM mudar o
arquivo oficial (mesmo SHA-256) — ex.: retirada do timbre institucional
(27/10/2026). A conferência humana original é mantida e registrada; nada é
aprovado se o arquivo tiver mudado.

Uso (na raiz): python scripts/revisao/reprocessar_publicados.py "<motivo>" [id ...]
(sem ids, reprocessa todos os publicados)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from gpecss import catalogo, processamento, revisao  # noqa: E402
from gpecss.esquema import transitar  # noqa: E402

motivo = sys.argv[1] if len(sys.argv) > 1 else "reprocessamento técnico"
somente = set(sys.argv[2:])

for r in catalogo.todos():
    if r["estado_fluxo"] != "publicado" or (somente and r["id"] not in somente):
        continue
    conf = dict(r["conferencia"])
    versao = r["versao_atual"]
    situacao, assunto, secundarios = r["situacao_normativa"], r.get("assunto_principal"), r.get("assuntos_secundarios")
    transitar(r, "processado", "processador", f"reprocessamento técnico: {motivo}")
    catalogo.salvar(r)
    processamento.processar(r["id"], log=lambda *a: None)
    r = catalogo.carregar(r["id"])
    if r["versao_atual"] != versao:
        print("ATENÇÃO: versão do arquivo mudou; não reaprovado:", r["id"])
        continue
    obs = (conf.get("observacoes") or "") + f" | Reprocessamento técnico: {motivo}; mesmo arquivo (SHA-256), conferência original mantida."
    r["conferencia_original"] = conf
    catalogo.salvar(r)
    revisao.aprovar(r["id"], conf["responsavel"], situacao, assunto, secundarios, obs, r["redistribuicao"])
    revisao.publicar(r["id"], conf["responsavel"])
    print("republicado:", r["id"])

"""D58: legislação complementar (páginas oficiais do Planalto salvas pelo navegador, porque o Planalto
recusa download automático). Entra como norma (camada 1) com `legislacao_complementar: true` — pesa
menos na busca e aparece na categoria "Legislação complementar". Aguarda conferência (D27).
Uso: py scripts/importar_legislacao_complementar.py <pasta com planalto_*.htm>
"""
import hashlib
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402
from gpecss.esquema import agora_iso, registro_vazio, transitar  # noqa: E402

P = "https://www.planalto.gov.br/ccivil_03/"
LEIS = {
    "planalto_cf88.htm": ("constituicao-federal-1988", "Constituição da República Federativa do Brasil de 1988", "Congresso Nacional", "lei", None, 1988, P + "constituicao/constituicao.htm"),
    "planalto_clt.htm": ("clt-decreto-lei-5452-1943", "Consolidação das Leis do Trabalho — Decreto-Lei nº 5.452/1943", "Presidência da República", "decreto", "5452", 1943, P + "decreto-lei/del5452compilado.htm"),
    "planalto_l8112.htm": ("lei-8112-1990", "Lei nº 8.112/1990 — Regime jurídico dos servidores públicos civis da União", "Congresso Nacional", "lei", "8112", 1990, P + "leis/l8112cons.htm"),
    "planalto_lcp75.htm": ("lei-complementar-75-1993", "Lei Complementar nº 75/1993 — Estatuto do Ministério Público da União (inclui o MPT)", "Congresso Nacional", "lei", "75", 1993, P + "leis/lcp/lcp75.htm"),
    "planalto_lcp80.htm": ("lei-complementar-80-1994", "Lei Complementar nº 80/1994 — Organização da Defensoria Pública", "Congresso Nacional", "lei", "80", 1994, P + "leis/lcp/lcp80.htm"),
    "planalto_l14457.htm": ("lei-14457-2022", "Lei nº 14.457/2022 — Programa Emprega + Mulheres (prevenção e combate ao assédio no trabalho)", "Congresso Nacional", "lei", "14457", 2022, P + "_ato2019-2022/2022/lei/l14457.htm"),
    "planalto_l9784.htm": ("lei-9784-1999", "Lei nº 9.784/1999 — Processo administrativo no âmbito da Administração Pública Federal", "Congresso Nacional", "lei", "9784", 1999, P + "leis/l9784.htm"),
}


def main() -> None:
    pasta = Path(sys.argv[1])
    for arq, (id_, titulo, orgao, tipo, num, ano, url) in LEIS.items():
        if (catalogo.DIR_CATALOGO / f"{id_}.json").exists():
            print(f"  {id_}: já no catálogo"); continue
        origem = pasta / arq
        dados = origem.read_bytes()
        sha = hashlib.sha256(dados).hexdigest()
        destino = catalogo.DIR_BRUTOS / id_ / f"{sha[:16]}.htm"
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origem, destino)
        reg = registro_vazio(id_, titulo, url)
        reg.update({"orgao_emissor": orgao, "tipo_documental": tipo, "numero": num, "ano": ano,
                    "legislacao_complementar": True, "categoria_portal": "Legislação complementar (D58)"})
        agora = agora_iso()
        reg["arquivos"] = [{"url": url, "papel": "html_oficial", "sha256": sha, "bytes": len(dados), "tipo_mime": "text/html",
                            "data_coleta": agora, "verificado_em": agora,
                            "caminho_local": destino.relative_to(catalogo.RAIZ).as_posix(), "versao": sha[:16]}]
        reg["versao_atual"] = sha[:16]
        transitar(reg, "baixado", "coletor", "página oficial do Planalto salva pelo navegador em 11/11/2026")
        catalogo.salvar(reg)
        print(f"  {id_}: baixado")


if __name__ == "__main__":
    main()

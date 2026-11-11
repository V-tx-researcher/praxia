"""D57: inclui no catálogo (camada 1, normas) os normativos novos aprovados na triagem de
11/11/2026 (Desktop\\Acervo_CFESS\\PraxIA_triagem_normativos.xlsx). Os arquivos vêm do acervo baixado;
entram como `baixado` com situação `nao_verificada` e seguem para conferência humana (D27).
Uso: py scripts/importar_normativos_triados.py <pasta Acervo_CFESS_CRESS_ABEPSS>
"""
import csv
import hashlib
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402
from gpecss.esquema import agora_iso, registro_vazio, transitar  # noqa: E402

# id do inventário → (id no catálogo, título, órgão, tipo, abrangência, número, ano)
NOVOS = {
    "D01702": ("cne-ces-resolucao-15-2002", "Resolução CNE/CES nº 15/2002 — Diretrizes Curriculares para os cursos de Serviço Social",
               "Conselho Nacional de Educação", "resolucao", "nacional", "15", 2002),
    "D01698": ("cns-resolucao-569-2017", "Resolução CNS nº 569/2017 — Princípios gerais para as diretrizes curriculares da área da saúde",
               "Conselho Nacional de Saúde", "resolucao", "nacional", "569", 2017),
    "D00861": ("lei-12852-2013", "Lei nº 12.852/2013 — Estatuto da Juventude", "Congresso Nacional", "lei", "nacional", "12852", 2013),
    "D03180": ("cress-df-orientacao-normativa-1-2020", "Orientação Normativa CRESS-DF nº 01/2020 — competências e guarda de material técnico",
               "CRESS-DF", "orientacao_normativa", "regional:DF", "1", 2020),
    "D01731": ("cress-pa-instrucao-normativa-1-desagravo", "Instrução Normativa CRESS-PA nº 01 — tramitação de requerimentos de desagravo",
               "CRESS-PA", "outro", "regional:PA", "1", None),
    "D03212": ("cress-rs-resolucao-desagravo", "Resolução CRESS-RS — procedimentos para o desagravo público",
               "CRESS-RS", "resolucao", "regional:RS", None, None),
    "D03047": ("cress-ba-resolucao-15-2022", "Resolução CRESS-BA nº 015/2022 — tramitação dos processos éticos e disciplinares",
               "CRESS-BA", "resolucao", "regional:BA", "15", 2022),
    "D03183": ("cress-sp-resolucao-108-2019", "Resolução CRESS-SP nº 108/2019 — orientação, fiscalização e defesa da profissão",
               "CRESS-SP", "resolucao", "regional:SP", "108", 2019),
    "D03736": ("cress-rn-resolucao-2-2020", "Resolução CRESS-RN nº 2/2020 — conduta profissional na regulação de leitos",
               "CRESS-RN", "resolucao", "regional:RN", "2", 2020),
}


def main() -> None:
    acervo = Path(sys.argv[1])
    linhas = {r["ID"]: r for r in csv.DictReader(open(acervo / "relatorio_downloads.csv", encoding="utf-8-sig"), delimiter=";")}
    for inv, (id_, titulo, orgao, tipo, abr, num, ano) in NOVOS.items():
        if (catalogo.DIR_CATALOGO / f"{id_}.json").exists():
            print(f"  {id_}: já no catálogo"); continue
        r = linhas[inv]
        origem = acervo / r["Arquivo relativo"]
        dados = origem.read_bytes()
        sha = hashlib.sha256(dados).hexdigest()
        destino = catalogo.DIR_BRUTOS / id_ / f"{sha[:16]}{origem.suffix.lower()}"
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origem, destino)
        url = r["URL final"] or r["URL localizada"] or r["URL do item"]
        reg = registro_vazio(id_, titulo, r["URL do item"] or url)
        reg.update({"orgao_emissor": orgao, "tipo_documental": tipo, "abrangencia": abr, "numero": num, "ano": ano,
                    "categoria_portal": f"Acervo CFESS-CRESS-ABEPSS ({inv})"})
        agora = agora_iso()
        reg["arquivos"] = [{"url": url, "papel": "principal", "sha256": sha, "bytes": len(dados),
                            "tipo_mime": "application/pdf", "data_coleta": agora, "verificado_em": agora,
                            "caminho_local": destino.relative_to(catalogo.RAIZ).as_posix(), "versao": sha[:16]}]
        reg["versao_atual"] = sha[:16]
        transitar(reg, "baixado", "coletor", f"arquivo do acervo baixado em 10/11/2026 ({inv}); triagem de 11/11/2026")
        catalogo.salvar(reg)
        print(f"  {id_}: baixado")


if __name__ == "__main__":
    main()

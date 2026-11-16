"""D61: inclui na camada 2 a página do CFESS "Conselho profissional x sindicato: você sabe a diferença?"
(29/07/2025), salva em PDF pelo responsável. Explica o que cabe ao Conselho e o que cabe ao sindicato:
base para o modo "Quem pode me ajudar?". Entra NÃO conferida (só na prévia, D27).
Uso: py scripts/importar_conselho_sindicato.py <caminho do PDF>
"""
import hashlib
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import interpretacao  # noqa: E402
from gpecss.esquema import agora_iso  # noqa: E402

ID = "cfess-conselho-x-sindicato-2025"


def main() -> None:
    origem = Path(sys.argv[1])
    cfg = interpretacao.carregar_config()
    if any(d["id"] == ID for d in cfg["documentos"]):
        print("já na camada 2"); return
    dados = origem.read_bytes()
    interpretacao.DIR_BRUTOS.mkdir(parents=True, exist_ok=True)
    shutil.copy2(origem, interpretacao.DIR_BRUTOS / f"{ID}.pdf")
    cfg["documentos"].append({
        "id": ID, "orgao": "CFESS", "tipo": "cartilha", "ano": 2025,
        "titulo": "Conselho profissional x sindicato: você sabe a diferença?",
        "url": "https://www.cfess.org.br", "fonte_oficial_url": "https://www.cfess.org.br",
        "assuntos": ["competência do conselho", "sindicato", "relações de trabalho", "salário", "jornada de 30 horas"],
        "sha256": hashlib.sha256(dados).hexdigest(), "data_coleta": agora_iso(), "bytes": len(dados),
        "alertas": ["link_oficial_a_confirmar"], "conferido": False,
        "origem_acervo": {"id_inventario": None, "tipo_inventario": "Notícia do site do CFESS (29/07/2025), salva em PDF"},
    })
    interpretacao.salvar_config(cfg)
    print(ID)


if __name__ == "__main__":
    main()

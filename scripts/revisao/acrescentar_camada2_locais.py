"""Acrescenta à camada 2 documentos baixados à mão (o revisor baixou do site oficial).

Copia o PDF para dados/brutos/camada2/<id>.pdf, registra SHA-256 e a URL oficial em
dados/configuracao/camada2.json. Depois: python -m gpecss camada2 processar <ids> e indexar.

Uso: python scripts/revisao/acrescentar_camada2_locais.py <pasta-dos-pdfs>
"""

import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONFIG = RAIZ / "dados" / "configuracao" / "camada2.json"
U = "https://www.cfess.org.br/arquivos/"
SERIE = "Série Assistente Social no Combate ao Preconceito, caderno "

NOVOS = [
    ("CFESS-Caderno02-OEstigmaDrogas-Site.pdf", {"id": "cfess-caderno-2-drogas", "tipo": "documento_orientativo", "ano": 2016,
     "titulo": "O estigma do uso de drogas", "edicao": SERIE + "2", "assuntos": ["deveres_profissionais", "relacao_usuarios"]}),
    ("CFESS-Caderno05-Xenofobia-Site.pdf", {"id": "cfess-caderno-5-xenofobia", "tipo": "documento_orientativo", "ano": 2016,
     "titulo": "Xenofobia", "edicao": SERIE + "5", "assuntos": ["deveres_profissionais", "relacao_usuarios"]}),
    ("CFESS-Caderno06-Machismo-Site.pdf", {"id": "cfess-caderno-6-machismo", "tipo": "documento_orientativo", "ano": 2019,
     "titulo": "Machismo", "edicao": SERIE + "6", "assuntos": ["deveres_profissionais", "relacao_usuarios"]}),
    ("CFESS-Caderno08-SaudeMental-Site.pdf", {"id": "cfess-caderno-8-saude-mental", "tipo": "documento_orientativo", "ano": 2022,
     "titulo": "Discriminação contra a população usuária da saúde mental", "edicao": SERIE + "8",
     "url": "https://www.cfess.org.br/uploads/revista/4015/ENLZaDRQAc16jXMo566c6xTgHMZOBdHP.pdf",
     "assuntos": ["deveres_profissionais", "relacao_usuarios"]}),
    ("CFESS-NotaTecnica-TanhiaDahmer-ComissaoClassificacao.pdf", {"id": "cfess-nota-comissao-classificacao-2016", "tipo": "nota_tecnica",
     "ano": 2016, "titulo": "Nota técnica: problematizando a função da Comissão Técnica de Classificação no contexto do Estado Penal",
     "autoria": "PEREIRA, Tania Maria Dahmer", "assuntos": ["competencias", "autonomia_profissional"]}),
    ("CFESS-NotaTecnica-SilviaTejadas-Sinase.pdf", {"id": "cfess-nota-sinase-2016", "tipo": "nota_tecnica", "ano": 2016,
     "titulo": "Nota técnica acerca da atuação das/os assistentes sociais em comissão de avaliação disciplinar conforme previsão do SINASE",
     "autoria": "TEJADAS, Silvia da Silva", "assuntos": ["competencias", "autonomia_profissional"]}),
    ("CFESS-NotaTecnica-MarineteMoreira-BPC.pdf", {"id": "cfess-nota-bpc-2017", "tipo": "nota_tecnica", "ano": 2017,
     "titulo": "Nota técnica: considerações sobre a dimensão social presente no processo de reconhecimento de direito ao Benefício de Prestação Continuada (BPC) e a atuação da/o assistente social",
     "autoria": "MOREIRA, Marinete Cordeiro", "assuntos": ["competencias", "documentos_tecnicos"]}),
    ("2019Cfess-NotaTecnicaINSS.pdf", {"id": "cfess-nota-inss-2019", "tipo": "nota_tecnica", "ano": 2019,
     "titulo": "Nota técnica em defesa das atribuições profissionais da(o) assistente social do INSS, do trabalho com autonomia profissional e com garantia das condições técnicas e éticas",
     "assuntos": ["atribuicoes_privativas", "condicoes_eticas_tecnicas"]}),
    ("CFESS-SubsidiosPoliticaUrbana-Site.pdf", {"id": "cfess-subsidios-politica-urbana-2016", "tipo": "documento_orientativo", "ano": 2016,
     "titulo": "Atuação de assistentes sociais na política urbana: subsídios para reflexão",
     "edicao": "Série Trabalho e Projeto Profissional nas Políticas Sociais, n. 5", "assuntos": ["competencias", "exercicio_profissional"]}),
    ("manualassistsociaispsicologo2020.pdf", {"id": "cfess-cfp-educacao-basica-2020", "tipo": "documento_orientativo", "ano": 2020,
     "titulo": "Psicólogas(os) e assistentes sociais na rede pública de educação básica: orientações para regulamentação da Lei 13.935, de 2019",
     "autoria": "CONSELHO FEDERAL DE PSICOLOGIA; CONSELHO FEDERAL DE SERVIÇO SOCIAL", "assuntos": ["competencias", "exercicio_profissional"]}),
    ("nota-entidades-resjuridica2024.pdf", {"id": "cfess-nota-residencia-juridica-2024", "tipo": "nota_tecnica", "ano": 2024,
     "titulo": "Manifestação interinstitucional sobre a residência em Serviço Social em unidades do Ministério Público e Tribunais de Justiça",
     "assuntos": ["formacao_profissional", "supervisao_estagio"]}),
]


def main() -> int:
    pasta = Path(sys.argv[1])
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    existentes = {d["id"] for d in cfg["documentos"]}
    destino = RAIZ / "dados" / "brutos" / "camada2"
    destino.mkdir(parents=True, exist_ok=True)
    for arquivo, meta in NOVOS:
        origem = pasta / arquivo
        conteudo = origem.read_bytes()
        if not conteudo.startswith(b"%PDF"):
            raise RuntimeError(f"{arquivo}: não é PDF")
        shutil.copy2(origem, destino / f"{meta['id']}.pdf")
        d = {"orgao": "CFESS", "url": U + arquivo, **meta, "sha256": hashlib.sha256(conteudo).hexdigest(),
             "data_coleta": datetime.now(timezone.utc).isoformat(timespec="seconds"), "bytes": len(conteudo),
             "origem_arquivo": "baixado pelo revisor no site oficial"}
        if d["id"] in existentes:
            cfg["documentos"] = [x if x["id"] != d["id"] else {**x, **d} for x in cfg["documentos"]]
        else:
            cfg["documentos"].append(d)
    CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(" ".join(m["id"] for _, m in NOVOS))
    return 0


if __name__ == "__main__":
    sys.exit(main())

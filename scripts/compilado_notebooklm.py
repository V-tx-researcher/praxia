"""Compilado em texto da base da PraxIA, para usar no NotebookLM (ou outro leitor de fontes).

Junta o texto já extraído e conferido dos índices públicos — normas (camada 1) e
orientações institucionais (camada 2) — em arquivos .txt leves, cada um abaixo do
limite de ~500 mil palavras por fonte do NotebookLM, e um .zip com todos.
Saída: app/baixar/ (vai para o site junto com o app).

Uso: python scripts/compilado_notebooklm.py
"""

import json
import sys
import zipfile
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DADOS = RAIZ / "app" / "dados"
SAIDA = RAIZ / "app" / "baixar"
LIMITE_PALAVRAS = 450_000  # margem abaixo do limite de 500 mil por fonte
SITE = "https://v-tx-researcher.github.io/praxia/"

CABECALHO = """PraxIA — base documental da consulta ético-normativa do Serviço Social (GPECSS)
{parte}
Gerado em {data} a partir dos índices públicos da PraxIA ({site}).

O QUE É: texto integral, extraído e conferido com os PDFs oficiais, das normas do Conjunto
CFESS-CRESS e das orientações institucionais (CFESS, CRESS e ABEPSS) que a PraxIA consulta.
Cada documento traz a situação de vigência e o link do PDF oficial.

COMO USAR NO NOTEBOOKLM: adicione os arquivos deste pacote como fontes e faça perguntas.
Peça sempre a fonte (documento, artigo, página).

AVISOS
- Ferramenta independente de pesquisa; não é manifestação do CFESS nem de qualquer CRESS.
- NORMAS valem como regra; ORIENTAÇÕES INSTITUCIONAIS explicam como as entidades
  interpretam e aplicam as normas, mas não são normas.
- Normas revogadas ou suspensas aparecem marcadas: use-as só como referência histórica.
- Confira sempre o documento oficial antes de citar.
"""


def bloco_norma(d: dict, unidades: list[dict]) -> str:
    linhas = ["", "=" * 78, f"NORMA: {d['titulo']}",
              f"Tipo: {d['tipo_rotulo']} · Órgão: {d['orgao']}" + (f" · Ano: {d['ano']}" if d.get("ano") else ""),
              f"Situação: {d['situacao_rotulo']}"]
    if d.get("nota_vigencia"):
        linhas.append(f"Vigência: {d['nota_vigencia']}")
    if d.get("ementa"):
        linhas.append(f"Ementa: {' '.join(d['ementa'].split())}")
    linhas += [f"PDF oficial: {d.get('arquivo_url') or d.get('fonte_oficial_url')}", "=" * 78]
    parte = None
    for u in unidades:
        if u["parte"] != parte:
            parte = u["parte"]
            linhas += ["", f"## {parte}"]
        marca = "" if u["tipo"] in {"trecho", "apresentacao", "anexo"} else f"[{u['rotulo']}] "
        aviso = f" (ATENÇÃO: {u['nota_vigencia']})" if u.get("nota_vigencia") else ""
        linhas.append(f"{marca}{' '.join(u['texto'].split())}{aviso} (p. {u['pagina']})")
    return "\n".join(linhas) + "\n"


def bloco_orientacao(d: dict, unidades: list[dict]) -> str:
    linhas = ["", "=" * 78, f"ORIENTAÇÃO INSTITUCIONAL (não é norma): {d['titulo']}",
              f"{d['orgao']}" + (f" · {d['ano']}" if d.get("ano") else "") + (f" · {d['edicao']}" if d.get("edicao") else "")
              + (f" · Autoria: {d['autoria']}" if d.get("autoria") else "")]
    if d.get("nota_vigencia"):
        linhas.append(f"Atenção: {d['nota_vigencia']}")
    linhas += [f"Referência: {d['referencia']}", "=" * 78]
    pagina = None
    for u in unidades:
        if u["pagina"] != pagina:
            pagina = u["pagina"]
            linhas.append(f"\n[p. {pagina}]")
        linhas.append(" ".join(u["texto"].split()))
    return "\n".join(linhas) + "\n"


def blocos(arquivo: str, montar) -> list[tuple[str, int]]:
    indice = json.loads((DADOS / arquivo).read_text(encoding="utf-8"))
    por_doc: dict[str, list] = {}
    for u in indice["unidades"]:
        por_doc.setdefault(u["doc"], []).append(u)
    saida = []
    for d in indice["documentos"]:
        texto = montar(d, por_doc.get(d["id"], []))
        saida.append((texto, len(texto.split())))
    return saida


def main() -> int:
    SAIDA.mkdir(parents=True, exist_ok=True)
    for antigo in SAIDA.glob("praxia-base*"):
        antigo.unlink()
    normas = blocos("acervo-publico.json", bloco_norma)
    orientacoes = blocos("interpretacao-publico.json", bloco_orientacao)
    # Normas abrem a parte 1; as orientações enchem as partes até o limite de palavras.
    partes: list[list[str]] = [["\n# PARTE A — NORMAS DO CONJUNTO CFESS-CRESS\n"] + [t for t, _ in normas]]
    contagem = [sum(n for _, n in normas)]
    partes[0].append("\n# PARTE B — ORIENTAÇÕES INSTITUCIONAIS (CFESS, CRESS, ABEPSS)\n")
    for texto, n in orientacoes:
        if contagem[-1] + n > LIMITE_PALAVRAS:
            partes.append(["\n# PARTE B — ORIENTAÇÕES INSTITUCIONAIS (continuação)\n"])
            contagem.append(0)
        partes[-1].append(texto)
        contagem[-1] += n
    arquivos = []
    for i, conteudo in enumerate(partes, start=1):
        nome = f"praxia-base-{i}-de-{len(partes)}.txt"
        cab = CABECALHO.format(parte=f"Arquivo {i} de {len(partes)}", data=date.today().strftime("%d/%m/%Y"), site=SITE)
        (SAIDA / nome).write_text(cab + "".join(conteudo), encoding="utf-8")
        arquivos.append(nome)
    zipado = SAIDA / "praxia-base-notebooklm.zip"
    with zipfile.ZipFile(zipado, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for nome in arquivos:
            z.write(SAIDA / nome, nome)
    for nome, n in zip(arquivos, contagem):
        print(f"{nome}: {n:,} palavras, {(SAIDA / nome).stat().st_size / 1048576:.1f} MB".replace(",", "."))
    print(f"{zipado.name}: {zipado.stat().st_size / 1048576:.1f} MB ({len(normas)} normas, {len(orientacoes)} orientações)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

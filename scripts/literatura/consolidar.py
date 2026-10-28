"""Consolida o levantamento de literatura crítica (camada 3) em app/dados/literatura.json.

Entrada: docs/revisao/literatura_bloco_N.csv (formato do PROMPT_ChatGPT_literatura_critica.md)
e, se existir, dados/literatura/links.json (resultado de conferir_links.py).

O que faz:
  - remove repetidos (mesmo DOI ou mesmo título normalizado), unindo blocos, normas e temas;
  - liga cada texto às normas do acervo (ids de documento; Lei 8.662 e Lei 12.317 à parte,
    porque estão dentro do livreto do Código de Ética);
  - monta a referência ABNT (NBR 6023) a partir das colunas;
  - registra pendências ("conferir ...") em docs/revisao/literatura_conferencia.md.

A plataforma mostra só referência, resumo de triagem e link: nada do texto dos artigos,
e esses textos nunca entram nas evidências nem no contexto da IA (D40).

Uso: python scripts/literatura/consolidar.py
"""

import csv
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ENTRADA = RAIZ / "docs" / "revisao"
LINKS = RAIZ / "dados" / "literatura" / "links.json"
ACERVO = RAIZ / "app" / "dados" / "acervo-publico.json"
SAIDA = RAIZ / "app" / "dados" / "literatura.json"
RELATORIO = RAIZ / "docs" / "revisao" / "literatura_conferencia.md"

BLOCOS = {
    "1": "Código de Ética",
    "2": "Lei 8.662/1993 e atribuições privativas",
    "3": "Sigilo e documentos técnicos",
    "4": "Condições de trabalho e jornada de 30 horas",
    "5": "Fiscalização do exercício profissional",
    "6": "Processo ético e desagravo",
    "7": "Estágio supervisionado",
    "8": "Direitos humanos e combate às discriminações",
}
# Norma de referência de cada bloco, usada só quando a linha não indica nenhuma norma.
NORMA_DO_BLOCO = {"1": "cfess-codigo-etica-1993", "7": "cfess-resolucao-533-2008"}

POSICOES = {"favoravel", "critica", "divergente", "historica", "descritiva"}

# Correções de metadados conferidas na curadoria (fonte indicada ao lado).
CORRECOES = {
    # Portal da revista Emancipação registra Rosana Mirales; o PDF traz "Rosane" (erro tipográfico).
    "os processos de violacoes etico-disciplinares no conselho regional de servico social do parana":
        {"autoria": "MIRALES, Rosana"},
    # Ano do fascículo (ABNT usa o ano do fascículo, não o da publicação eletrônica).
    "fiscalizacao do exercicio profissional dos/as assistentes sociais e suas peculiaridades": {"ano": "2018"},
    "o assistente social na luta por direitos: a lei 12.317/2010 e as condicoes de trabalho impostas pelo neoliberalismo":
        {"ano": "2024"},
    # Data incerta: página institucional de 2014, referências de terceiros indicam 2013.
    "meia formacao nao garante um direito: o que voce precisa saber sobre a supervisao direta de estagio em servico social":
        {"ano": "[2013 ou 2014]"},
}

# Links trocados na curadoria: o original não abriu e o mesmo texto foi achado na fonte oficial.
SUBSTITUI_LINK = {
    # Dialnet recusa conexão automatizada; página oficial do periódico Argumentum (UFES), mesmo DOI.
    "https://dialnet.unirioja.es/descarga/articulo/8946274.pdf":
        "https://periodicos.ufes.br/argumentum/article/view/34572",
    # Endereço antigo deu 404; o CFESS republicou o mesmo folder (6 p., "CFESS 2019", CEDH).
    "https://www.cfess.org.br/uploads/revista/4674/k6ahfHCAARq6x6TaoNor0i-D84cQj5F5.pdf":
        "https://www.cfess.org.br/arquivos/CFESS-NomeSocial-Folder30x25cm-Montado.pdf",
}

# Respostas que indicam bloqueio de robôs (o link abre no navegador de uma pessoa).
BLOQUEIO_ROBO = {403, 429, 468}

LOCAL_EDITORA = {
    "CFESS": "Brasília, DF: CFESS",
    "CRESS-SP": "São Paulo: CRESS-SP",
    "CRESS-MA": "São Luís: CRESS-MA",
    "CRESS-PB": "João Pessoa: CRESS-PB",
    "EDUFPI": "Teresina: EDUFPI",
}


def normalizar(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[“”\"'‘’]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def ler_csvs():
    linhas = []
    for arq in sorted(ENTRADA.glob("literatura_bloco_*.csv")):
        with arq.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f, delimiter=";"):
                if not (r.get("titulo") or "").strip():
                    continue
                r = {k.strip(): (v or "").strip() for k, v in r.items() if k}
                r["_arquivo"] = arq.name
                linhas.append(r)
    return linhas


def ids_do_acervo():
    dados = json.loads(ACERVO.read_text(encoding="utf-8"))
    return {d["id"]: d for d in dados["documentos"]}


RE_RES = re.compile(r"\b(?:Res\.|Resolu[çc][ãa]o(?:es)?)\s*(?:CFESS\s*)?(?:n[º°o.]*\s*)?([\d.]+)/(\d{4})", re.I)
RE_ON = re.compile(r"\b(?:ON|Orienta[çc][ãa]o Normativa)\s*(?:CFESS\s*)?(?:n[º°o.]*\s*)?(\d+)/(\d{4})", re.I)


def ligar_normas(texto: str, bloco: str, acervo: dict):
    """Devolve (ids ligados, normas citadas que não estão no acervo)."""
    ids, fora = [], []

    def add(i):
        if i not in ids:
            ids.append(i)

    for parte in [p.strip() for p in texto.split(";") if p.strip()]:
        achou = False
        if re.search(r"C[óo]digos? de [ÉE]tica(?: do Servi[çc]o Social)?(?: de)? (?:1993|1947|1965|1975|1986)|Res\.? CFESS 273/1993", parte, re.I):
            add("cfess-codigo-etica-1993")
            achou = True
        if re.search(r"Lei\s*(?:n[º°]\s*)?8\.?662", parte, re.I):
            add("lei-8662")
            achou = True
        if re.search(r"Lei\s*(?:n[º°]\s*)?12\.?317|jornada de 30 horas", parte, re.I):
            add("lei-12317")
            achou = True
        if re.search(r"Pol[íi]tica Nacional de Fiscaliza[çc][ãa]o", parte, re.I):
            add("cfess-resolucao-512-2007")  # a PNF é instituída pela Res. 512/2007
            achou = True
        for num, ano in RE_RES.findall(parte):
            n = num.replace(".", "")
            if n == "273" and ano == "1993":
                continue
            cand = [i for i in acervo if re.fullmatch(rf"cfess-resolucao-{n}-{ano}(?:-p\d+)?", i)]
            if cand:
                add(cand[0])
                achou = True
        for num, ano in RE_ON.findall(parte):
            i = f"cfess-orientacao-normativa-{num}-{ano}"
            if i in acervo:
                add(i)
                achou = True
        if not achou:
            fora.append(parte)
    if not ids and bloco in NORMA_DO_BLOCO:
        add(NORMA_DO_BLOCO[bloco])
    return ids, fora


def separar_autores(autoria: str):
    return [a.strip() for a in autoria.split(";") if a.strip()]


def fim(t: str) -> str:
    t = t.strip()
    return t if t.endswith((".", "?", "!")) else t + "."


def editora(publicado_em: str) -> str:
    for chave, valor in LOCAL_EDITORA.items():
        if publicado_em.startswith(chave) or f"({chave})" in publicado_em or chave in publicado_em.split(",")[0]:
            return valor
    if "São Paulo" in publicado_em and "CRESS" in publicado_em.upper() or "9ª Região" in publicado_em:
        return LOCAL_EDITORA["CRESS-SP"]
    return f"[S. l.]: {publicado_em}"


def referencia(r: dict) -> str:
    autores = "; ".join(separar_autores(r["autoria"])) or "[AUTORIA NÃO IDENTIFICADA]"
    titulo, ano, vnp = r["titulo"], r["ano"] or "[s. d.]", r["volume_numero_paginas"]
    link = r["link_texto_integral"]
    doi = f" DOI: https://doi.org/{r['doi']}." if r["doi"] else ""
    disp = f" Disponível em: {link}."
    tipo = r["tipo"]
    if tipo == "artigo":
        partes = [p for p in [r["publicado_em"], vnp, ano] if p]
        return f"{fim(autores)} {fim(titulo)} {', '.join(partes)}.{doi}{disp}"
    if tipo in ("dissertacao", "tese"):
        grau = "Dissertação (Mestrado)" if tipo == "dissertacao" else "Tese (Doutorado)"
        ext = f" {fim(vnp)}" if vnp else ""
        return f"{fim(autores)} {fim(titulo)} {ano}.{ext} {grau} – {r['publicado_em']}, {ano}.{disp}"
    if tipo == "capitulo":
        pub = r["publicado_em"]
        org, _, obra = pub.partition("In:")
        org = org.strip().rstrip(".")
        obra = obra.strip()
        if org == "CFESS":
            fonte = f"In: CONSELHO FEDERAL DE SERVIÇO SOCIAL (Brasil). {fim(obra)} Brasília, DF: CFESS, {ano}."
        else:
            obra_t, _, ed = (obra or pub).rpartition(".")
            fonte = f"In: {fim(obra_t.strip())} [S. l.]: {ed.strip()}, {ano}."
        pag = f" {fim(vnp)}" if vnp else ""
        return f"{fim(autores)} {fim(titulo)} {fonte}{pag}{disp}"
    # livro, publicação institucional, nota ou notícia institucional
    ed = editora(r["publicado_em"])
    det = f" {fim(vnp)}" if vnp else ""
    return f"{fim(autores)} {fim(titulo)} {ed}, {ano}.{det}{doi}{disp}"


def citacao(r: dict) -> str:
    autores = separar_autores(r["autoria"])
    if not autores:
        return ""
    sobrenome = lambda a: a.split(",")[0].split("(")[0].split("—")[0].strip()
    nomes = [sobrenome(a) for a in autores]
    if len(nomes) > 3:
        txt = f"{nomes[0]} et al."
    else:
        txt = "; ".join(nomes)
    txt = txt.replace("CONSELHO FEDERAL DE SERVIÇO SOCIAL", "CFESS")
    return f"({txt}, {r['ano'] or 's. d.'})"


def pendencias(r: dict):
    obs = r.get("observacoes", "")
    return [m.strip().rstrip(".") for m in re.findall(r"[Cc]onferir[^.]*\.", obs)]


def main() -> int:
    acervo = ids_do_acervo()
    links = json.loads(LINKS.read_text(encoding="utf-8")) if LINKS.exists() else {}
    linhas = ler_csvs()
    if not linhas:
        print("nenhum CSV encontrado em docs/revisao/literatura_bloco_*.csv")
        return 1

    itens, por_chave, problemas = [], {}, []
    for r in linhas:
        chave_t = normalizar(r["titulo"])
        r.update(CORRECOES.get(chave_t, {}))
        r["link_texto_integral"] = SUBSTITUI_LINK.get(r["link_texto_integral"], r["link_texto_integral"])
        if r["posicao"] not in POSICOES:
            problemas.append(f"posição desconhecida '{r['posicao']}' em {r['titulo']}")
        chave = r["doi"].lower() or chave_t
        normas, fora = ligar_normas(r["normas_discutidas"], r["bloco"], acervo)
        existente = por_chave.get(chave) or por_chave.get(chave_t)
        if existente:
            for b in [r["bloco"]]:
                if b not in existente["blocos"]:
                    existente["blocos"].append(b)
            for n in normas:
                if n not in existente["normas"]:
                    existente["normas"].append(n)
            for n in fora:
                if n not in existente["outras_normas"]:
                    existente["outras_normas"].append(n)
            for t in r["temas"].split(","):
                t = t.strip()
                if t and t not in existente["temas"]:
                    existente["temas"].append(t)
            existente["pendencias"] += [p for p in pendencias(r) if p not in existente["pendencias"]]
            continue
        item = {
            "id": f"lit-{len(itens) + 1:03d}",
            "tipo": r["tipo"],
            "autoria": r["autoria"],
            "titulo": r["titulo"],
            "ano": r["ano"],
            "publicado_em": r["publicado_em"],
            "link": r["link_texto_integral"],
            "doi": r["doi"],
            "licenca": r["licenca"] if r["licenca"] and r["licenca"] != "não informada" else "",
            "blocos": [r["bloco"]],
            "normas": normas,
            "outras_normas": fora,
            "temas": [t.strip() for t in r["temas"].split(",") if t.strip()],
            "resumo": r["resumo"],
            "posicao": r["posicao"],
            "referencia": referencia(r),
            "citacao": citacao(r),
            "pendencias": pendencias(r),
            "acesso_verificado_em": r["acesso_verificado_em"],
        }
        situacao = links.get(item["link"])
        if situacao:
            item["link_conferido"] = {"ok": situacao["ok"], "em": situacao["em"]}
            if not situacao["ok"] and situacao.get("status") in BLOQUEIO_ROBO:
                item["link_conferido"]["bloqueio_robo"] = True
        itens.append(item)
        por_chave[chave] = item
        por_chave[chave_t] = item

    sem_norma = [i for i in itens if not i["normas"]]
    por_norma = {}
    for i in itens:
        for n in i["normas"]:
            por_norma.setdefault(n, []).append(i["id"])
    # Link quebrado (não é bloqueio de robô): fica fora do app até achar outro endereço.
    links_falhos = [i for i in itens if i.get("link_conferido", {}).get("ok") is False
                    and not i["link_conferido"].get("bloqueio_robo")]
    bloqueados = [i for i in itens if i.get("link_conferido", {}).get("bloqueio_robo")]
    publicos = [i for i in itens if i not in links_falhos]
    sem_conferencia = [i for i in itens if "link_conferido" not in i]

    saida = {
        "formato": "gpecss-literatura-1",
        "gerado_em": date.today().isoformat(),
        "aviso": ("Leituras para aprofundar o estudo das normas. Não são normas, não fundamentam as respostas "
                  "e não são usadas pela IA. Resumos de triagem elaborados com apoio de IA: leia o texto original."),
        "blocos": BLOCOS,
        "itens": publicos,
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")

    rel = ["# Conferência da literatura crítica (camada 3)", "",
           f"Gerado por `scripts/literatura/consolidar.py` em {date.today().isoformat()}.", "",
           f"- Linhas nos CSVs: {len(linhas)}",
           f"- Textos únicos depois de tirar repetidos: {len(itens)}",
           f"- Textos ligados a pelo menos uma norma do acervo: {len(itens) - len(sem_norma)}",
           f"- Normas do acervo com leituras: {len(por_norma)}",
           f"- Links que não abriram na conferência automática: {len(links_falhos)}",
           f"- Links que recusam conferência automática (abrem no navegador): {len(bloqueados)}",
           f"- Links ainda não conferidos: {len(sem_conferencia)}",
           f"- Textos publicados no app: {len(publicos)}", "",
           "## Por posição", ""]
    for p in sorted(POSICOES):
        rel.append(f"- {p}: {sum(1 for i in itens if i['posicao'] == p)}")
    rel += ["", "## Leituras por norma", ""]
    for n, ids in sorted(por_norma.items(), key=lambda x: -len(x[1])):
        rel.append(f"- {n}: {len(ids)}")
    if links_falhos:
        rel += ["", "## Links que não abriram (fora do app até achar outro endereço)", ""]
        rel += [f"- {i['id']} — {i['titulo']} — {i['link']}" for i in links_falhos]
    if bloqueados:
        rel += ["", "## Links com bloqueio de robôs (mantidos; conferir no navegador)", ""]
        rel += [f"- {i['id']} — {i['titulo']} — {i['link']}" for i in bloqueados]
    rel += ["", "## Pendências anotadas na pesquisa", "",
            "Não impedem a publicação: são metadados secundários (paginação, DOI, licença) que o próprio",
            "levantamento deixou em branco por divergência entre fontes.", ""]
    for i in itens:
        for p in i["pendencias"]:
            rel.append(f"- {i['id']} ({i['citacao']}): {p}")
    if problemas:
        rel += ["", "## Problemas de formato", ""] + [f"- {p}" for p in problemas]
    RELATORIO.write_text("\n".join(rel) + "\n", encoding="utf-8")

    print(f"{len(linhas)} linhas -> {len(itens)} textos únicos; {len(por_norma)} normas com leituras; "
          f"{len(sem_norma)} sem norma; {len(links_falhos)} links falhos; {len(sem_conferencia)} não conferidos")
    for p in problemas:
        print("AVISO:", p)
    return 0


if __name__ == "__main__":
    sys.exit(main())

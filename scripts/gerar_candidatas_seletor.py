"""Gera app/js/seletor/candidatas.js a partir da consolidação V1-V10 (D45).
Entram só perguntas contextuais e naturais cujo trecho foi encontrado literalmente no acervo, de
documento não revogado/suspenso, sem as genéricas ("O que estabelece o Art. X…").
São perguntas NÃO REVISADAS: o app as mostra só como sugestão de reformulação, marcadas como tal,
e nenhuma resposta ou vínculo é transferido (a busca documental é refeita com a pergunta escolhida).
Uso: python scripts/gerar_candidatas_seletor.py [pasta_consolidacao]"""
import csv, json, sys
from pathlib import Path

PASTA = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Usuario\OneDrive\SubCOFI\LLM PraxIA\Banco_perguntas_V1_V10")
SAIDA = Path(__file__).resolve().parent.parent / "app/js/seletor/candidatas.js"

linhas = list(csv.DictReader(open(PASTA / "01_PERGUNTAS_CONSOLIDADAS.csv", encoding="utf-8-sig"), delimiter=";"))
import re, unicodedata
sem_acento = lambda s: unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
# Perguntas geradas por modelo fixo (não são dúvidas reais): saem do seletor.
MOLDE = re.compile(r"^(o que a orientacao|quais regras se aplicam|que conteudo apresenta|que limite, quantidade ou prazo"
                   r"|o que e expedicao|qual regra especifica|o que estabelece|o que diz o|o que preve o|o que determina o"
                   r"|que providencia|qual e a definicao|o que o documento|o que preve a|que competencia ou responsabilidade"
                   r"|que principio ou diretriz|quais condicoes ou procedimentos|quando o art|o que este dispositivo)")
vistas, out, moldes = set(), [], 0
for l in linhas:
    if MOLDE.match(sem_acento(l["pergunta"].strip())):
        moldes += 1; continue
    if l["tipo_pergunta"] not in ("contextual", "natural"): continue
    if not l["ligacao_trecho"].startswith("exata"): continue
    if l["situacao_documento"] in ("revogada", "suspensa"): continue
    q = " ".join(l["pergunta"].split())
    if len(q) < 15 or len(q) > 220 or q.lower() in vistas: continue
    vistas.add(q.lower())
    out.append({"id": l["id_consolidado"], "q": q, "doc": l["documento_id"]})

SAIDA.write_text(
    "// Gerado por scripts/gerar_candidatas_seletor.py (D45). Perguntas do banco consolidado V1-V10,\n"
    "// NÃO REVISADAS: só sugestão de reformulação; sem respostas; nenhum vínculo é transferido.\n"
    "window.PRAXIA_CANDIDATAS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8")
print(moldes, "perguntas de molde fora;", len(out), "candidatas;", SAIDA.stat().st_size // 1024, "KB")

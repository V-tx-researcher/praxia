"""Triagem proposta do acervo (D21): quais normas descobertas entram na plataforma.

Proposta do desenvolvimento a partir de título e ementa do portal do CFESS; a
decisão final é do revisor (Atividade nº 2). Gera dados/configuracao/triagem.json.

Uso (na raiz): python scripts/revisao/triagem_proposta.py
"""

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "pipeline"))
from gpecss import catalogo  # noqa: E402


def r(n, ano):
    return f"cfess-resolucao-{n}-{ano}"


INCLUIR = {
    # Regulamentação e ética
    r(383, 1999): "Assistente social como profissional da saúde",
    r(489, 2006): "Vedação de discriminação por orientação sexual no exercício profissional",
    r(512, 2007): "Normas da fiscalização profissional e Política Nacional de Fiscalização",
    r(533, 2008): "Supervisão direta de estágio",
    r(548, 2009): "Desaforamento de denúncias éticas",
    r(555, 2009): "Requisitos de registro profissional",
    r(557, 2009): "Pareceres, laudos e opiniões técnicas conjuntos",
    r(569, 2010): "Vedação de terapias associadas ao título profissional",
    r(572, 2010): "Registro obrigatório mesmo com outra denominação do cargo",
    r(590, 2010): "Multas por descumprimento da Lei 8.662/93 e exercício ilegal",
    r(594, 2011): "Alterações no Código de Ética (linguagem de gênero, princípios)",
    r(657, 2013): "Código Processual Disciplinar",
    r(782, 2016): "Instrumentais da fiscalização (visitas das COFI)",
    r(785, 2016): "Nome social de assistentes sociais travestis e transexuais",
    r(726, 2015): "Complementa o desaforamento de denúncias éticas",
    r(828, 2017): "Altera as normas da fiscalização (Res. 512/2007)",
    r(845, 2018): "Atuação no processo transexualizador",
    r(861, 2018): "Publicidade das penalidades éticas",
    r(923, 2019): "Registro em mídia digital de depoimentos nos processos",
    r(934, 2020): "Certidão disciplinar não caracteriza quebra de sigilo",
    r(938, 2020): "Prescrição nos processos (altera a Res. 660/2013)",
    r(943, 2020): "Altera o desaforamento de denúncias éticas",
    r(952, 2020): "Antecedentes profissionais (Art. 26 do Código de Ética)",
    r(954, 2020): "Anuidades: extinção da suspensão por débito",
    r(970, 2021): "Anula a revogação do Art. 22, c, do Código de Ética",
    r(992, 2022): "Vedação de discriminação contra pessoas com deficiência",
    r(1013, 2022): "Código Processual de Ética: falecimento da pessoa denunciada",
    r(1014, 2022): "Inscrição, transferência, cancelamento e reinscrição",
    r(1018, 2023): "Altera as normas de inscrição e registro",
    r(1031, 2023): "Anotação de Responsabilidade Técnica (ART)",
    r(1054, 2023): "Vedação de discriminação étnico-racial",
    r(1068, 2024): "Altera as normas de inscrição",
    r(1073, 2024): "Desagravo público (Art. 2º, e, do Código de Ética)",
    r(1084, 2024): "Laicidade no exercício profissional",
    r(1098, 2025): "Salvaguarda de documentos técnicos sigilosos",
    r(1103, 2025): "Altera o desaforamento de denúncias éticas",
    r(1114, 2025): "Condições éticas e técnicas do exercício profissional",
    r(1116, 2025): "Altera a Anotação de Responsabilidade Técnica",
    r(1147, 2026): "Altera as normas de inscrição",
    "cfess-orientacao-normativa-1-2018": "Orientação normativa (inscrição profissional)",
    "cfess-orientacao-normativa-2-2018": "Orientação normativa",
    "cfess-orientacao-normativa-3-2020": "Orientação normativa (atuação em serviços de saúde)",
    "cfess-orientacao-normativa-4-2020": "Orientação normativa (sigilo e trabalho em equipe)",
}

HISTORICAS = {
    r(443, 2003): "Desagravo público — substituída pela Res. 1.073/2024 (indicação do portal)",
    r(493, 2006): "Condições éticas e técnicas — revogada pela Res. 1.114/2025",
    r(513, 2007): "Lacração de material técnico — revogada",
    r(554, 2009): "Depoimento sem dano — invalidada judicialmente",
    r(556, 2009): "Lacração de material técnico — revogada pela Res. 1.098/2025",
    r(559, 2009): "Atuação como perito/testemunha — efeitos suspensos judicialmente",
    r(615, 2011): "Nome social — revogada (substituída pela Res. 785/2016)",
    r(792, 2017): "ART — revogada pela Res. 1.031/2023",
}

DUVIDA = {
    r(418, 2001): "Tabela referencial de honorários (prática autônoma)",
    r(467, 2005): "Altera a tabela de honorários",
    r(560, 2009): "Complementa requisitos de registro",
    r(582, 2010): "Consolidação das Resoluções — sem arquivo no portal",
    r(627, 2012): "Vedação de símbolos religiosos nas sedes dos Conselhos",
    r(661, 2013): "Gratuidade de nova via da cédula em caso de violência",
    r(707, 2015): "Novo documento de identidade profissional e vedação de retenção",
    r(777, 2016): "Política de enfrentamento à inadimplência",
    r(950, 2020): "Modelo de certidão disciplinar e/ou ética",
    r(988, 2022): "Atos eletrônicos nos processos disciplinares e éticos",
    r(1015, 2022): "Registro de pessoa jurídica",
    r(1047, 2023): "Altera a política de enfrentamento à inadimplência",
    r(1063, 2024): "Glossário em Libras do Serviço Social",
    r(1095, 2025): "Isenção de taxa da identidade profissional para pessoas trans",
}

JA_COBERTOS = {
    "cfess-codigo-etica-1993": "Já conferido e publicado",
    "lei-8662-1993": "Texto incluído no livreto do Código de Ética (já publicado)",
    "lei-12317-2010": "Texto incluído no livreto do Código de Ética (já publicado)",
    r(273, 1993): "Texto incluído no livreto do Código de Ética (já publicado)",
    "cfess-legislacao-208": "Duplicata da Res. 512/2007 (mesmo PDF)",
}


def main():
    regs = {x["id"]: x for x in catalogo.todos()}
    grupos = {"incluir": INCLUIR, "historicas": HISTORICAS, "duvida": DUVIDA, "ja_cobertos": JA_COBERTOS}
    for nome, g in grupos.items():
        faltam = [i for i in g if i not in regs]
        if faltam:
            raise SystemExit(f"{nome}: ids inexistentes no catálogo: {faltam}")
    marcados = set().union(*grupos.values())
    normativos = [x for x in regs.values() if x["tipo_documental"] != "portaria"]
    excluir = sorted((x for x in normativos if x["id"] not in marcados),
                     key=lambda x: (x.get("ano") or 0, int(x.get("numero") or 0)))
    saida = {
        "situacao": "PROPOSTA do desenvolvimento — aguarda decisão do revisor (Atividade nº 2)",
        "incluir": INCLUIR, "historicas": HISTORICAS, "duvida": DUVIDA, "ja_cobertos": JA_COBERTOS,
        "excluir": {x["id"]: (x.get("ementa") or x["titulo_oficial"])[:140] for x in excluir},
        "titulos": {x["id"]: x["titulo_oficial"] for x in normativos},
        "portarias_excluidas": sum(1 for x in regs.values() if x["tipo_documental"] == "portaria"),
    }
    destino = RAIZ / "dados" / "configuracao" / "triagem.json"
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print({k: len(v) if isinstance(v, dict) else v for k, v in saida.items() if k != "situacao"})


if __name__ == "__main__":
    main()

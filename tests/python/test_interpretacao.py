"""Camada 2 (D41): divisão em trechos, limpeza de diagramação e referência."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))

from gpecss import citacoes  # noqa: E402
from gpecss.interpretacao import linha_sem_conteudo, referencia_abnt, segmentar_trechos  # noqa: E402

PAGINA = "\n".join([
    "Retornar ao sumário",
    "fim de um parecer anterior que começou na página de trás.",
    "Palavras-chaves: penalidade; transferência.",
    "PARECER JURÍDICO nº. 06/13, de 18 de abril de 2013. O parecer discorre sobre o uso de câmeras",
    "em salas de atendimento e a quebra de sigilo profissional.",
    "( ) Sim ( ) Não",
])


class TestCamada2(unittest.TestCase):
    def test_linhas_de_diagramacao(self):
        self.assertTrue(linha_sem_conteudo("|||||||||||||||||||| Retornar ao sumário"))
        self.assertTrue(linha_sem_conteudo("( ) Não se aplica. Justificar"))
        self.assertTrue(linha_sem_conteudo("12 / 34 — 56"))
        self.assertFalse(linha_sem_conteudo("O sigilo protege o usuário."))

    def test_trechos_literais_e_separados_por_parecer(self):
        unidades = segmentar_trechos([PAGINA])
        self.assertEqual(len(unidades), 2)
        self.assertTrue(unidades[0]["texto"].endswith("transferência."))
        self.assertTrue(unidades[1]["texto"].startswith("PARECER JURÍDICO nº. 06/13"))
        self.assertNotIn("( )", " ".join(u["texto"] for u in unidades))
        texto_doc = {"paginas": [{"numero": 1, "texto": PAGINA}], "unidades": unidades}
        self.assertEqual(citacoes.verificar_unidades(texto_doc), [])

    def test_referencia(self):
        ref = referencia_abnt({"orgao": "ABEPSS", "titulo": "Política Nacional de Estágio", "ano": 2010,
                               "url": "https://exemplo.invalid/pne.pdf"})
        self.assertEqual(ref, "ASSOCIAÇÃO BRASILEIRA DE ENSINO E PESQUISA EM SERVIÇO SOCIAL. Política Nacional de "
                              "Estágio. [S. l.]: ABEPSS, 2010. Disponível em: https://exemplo.invalid/pne.pdf.")


if __name__ == "__main__":
    unittest.main()

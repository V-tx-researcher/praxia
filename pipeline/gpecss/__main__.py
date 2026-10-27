"""Linha de comando do pipeline documental.

Uso (a partir da pasta `pipeline/`):
  python -m gpecss descobrir [--categorias 3 4 9]
  python -m gpecss baixar ID [ID ...] [--historicos] [--url-extra URL]
  python -m gpecss processar ID [ID ...]
  python -m gpecss fila [--estado aguardando_conferencia]
  python -m gpecss mostrar ID
  python -m gpecss aprovar ID --responsavel "Nome" --situacao vigente_confirmada [--assunto ...]
  python -m gpecss rejeitar ID --responsavel "Nome" --motivo "..." [--fora-do-escopo]
  python -m gpecss publicar ID --responsavel "Nome"
  python -m gpecss indexar [--modo publico|previa]
  python -m gpecss validar
"""

from __future__ import annotations

import argparse
import sys

from . import catalogo, coleta, indice, processamento, revisao
from .esquema import ASSUNTOS, SITUACOES_NORMATIVAS, validar_registro


def main(argv=None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="gpecss", description="Pipeline documental GPECSS")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("descobrir", help="descobre documentos nas listagens oficiais do CFESS")
    d.add_argument("--categorias", nargs="*", type=int)
    d.add_argument("--max-paginas", type=int, default=60)
    d.add_argument("--atualizar-metadados", action="store_true")
    d.add_argument("--apenas-novos", action="store_true", help="não reabre páginas já catalogadas")

    b = sub.add_parser("baixar", help="baixa os arquivos oficiais de documentos descobertos")
    b.add_argument("ids", nargs="+")
    b.add_argument("--historicos", action="store_true", help="inclui edições históricas anexadas")
    b.add_argument("--url-extra", action="append", default=[])

    p = sub.add_parser("processar", help="extrai texto, segmenta e envia à fila de conferência")
    p.add_argument("ids", nargs="+")

    f = sub.add_parser("fila", help="lista documentos por estado")
    f.add_argument("--estado", action="append")

    m = sub.add_parser("mostrar", help="mostra o resumo de conferência de um documento")
    m.add_argument("id")

    a = sub.add_parser("aprovar", help="registra a conferência humana e aprova o documento")
    a.add_argument("id")
    a.add_argument("--responsavel", required=True)
    a.add_argument("--situacao", required=True, choices=sorted(SITUACOES_NORMATIVAS))
    a.add_argument("--assunto", choices=sorted(ASSUNTOS))
    a.add_argument("--assuntos-secundarios", nargs="*", choices=sorted(ASSUNTOS))
    a.add_argument("--observacoes")
    a.add_argument("--redistribuicao", choices=["link_e_excertos", "pdf_republicavel"])

    r = sub.add_parser("rejeitar", help="rejeita ou marca como fora do escopo")
    r.add_argument("id")
    r.add_argument("--responsavel", required=True)
    r.add_argument("--motivo", required=True)
    r.add_argument("--fora-do-escopo", action="store_true")

    pu = sub.add_parser("publicar", help="inclui um documento aprovado no acervo público")
    pu.add_argument("id")
    pu.add_argument("--responsavel", required=True)

    i = sub.add_parser("indexar", help="gera o índice consumido pela aplicação")
    i.add_argument("--modo", choices=["publico", "previa"], default="publico")

    sub.add_parser("validar", help="valida todos os registros do catálogo")

    args = ap.parse_args(argv)

    if args.cmd == "descobrir":
        print(coleta.descobrir(categorias=args.categorias, limite_paginas=args.max_paginas,
                               atualizar_metadados=args.atualizar_metadados, apenas_novos=args.apenas_novos))
    elif args.cmd == "baixar":
        for id_ in args.ids:
            print(id_, coleta.baixar(id_, incluir_historicos=args.historicos, urls_extras=args.url_extra))
    elif args.cmd == "processar":
        for id_ in args.ids:
            processamento.processar(id_)
    elif args.cmd == "fila":
        for reg in revisao.fila(args.estado):
            alertas = f"  ⚠ {', '.join(reg['alertas'])}" if reg["alertas"] else ""
            print(f"{reg['estado_fluxo']:<24} {reg['id']:<42} {reg['titulo_oficial'][:70]}{alertas}")
    elif args.cmd == "mostrar":
        print(revisao.resumo_documento(args.id))
    elif args.cmd == "aprovar":
        revisao.aprovar(args.id, args.responsavel, args.situacao, args.assunto,
                        args.assuntos_secundarios, args.observacoes, args.redistribuicao)
        print(f"{args.id}: aprovado por {args.responsavel}")
    elif args.cmd == "rejeitar":
        revisao.rejeitar(args.id, args.responsavel, args.motivo, args.fora_do_escopo)
        print(f"{args.id}: {'fora do escopo' if args.fora_do_escopo else 'rejeitado'}")
    elif args.cmd == "publicar":
        revisao.publicar(args.id, args.responsavel)
        print(f"{args.id}: publicado")
    elif args.cmd == "indexar":
        indice.construir(args.modo)
    elif args.cmd == "validar":
        total = falhas = 0
        for reg in catalogo.todos():
            total += 1
            erros = validar_registro(reg)
            if erros:
                falhas += 1
                print(f"{reg['id']}: {'; '.join(erros)}")
        print(f"{total} registros, {falhas} com problemas")
        return 1 if falhas else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())

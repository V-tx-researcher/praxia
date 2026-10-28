@echo off
rem Abre a Consulta Ético-Normativa (GPECSS) neste computador, com a análise por IA.
rem Serve a pasta "publicar" (a mesma que vai para o site) em http://127.0.0.1:8770
rem e abre o navegador. Feche esta janela para encerrar.
cd /d "%~dp0"
if not exist "publicar\index.html" python scripts\preparar_publicacao.py
start "" "http://127.0.0.1:8770/"
python -m http.server 8770 --bind 127.0.0.1 --directory publicar

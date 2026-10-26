"""Cliente HTTP educado: robots.txt, intervalo mínimo entre requisições e limites de tamanho."""

from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlparse

import requests

AGENTE = "GPECSS-ConsultaEticoNormativa/0.1 (coleta academica de documentos publicos; nao comercial)"
INTERVALO_MINIMO_S = 2.0
TAMANHO_MAXIMO = 80 * 1024 * 1024
TIMEOUT_S = 60


class AcessoNegado(RuntimeError):
    pass


class Cliente:
    def __init__(self, intervalo: float = INTERVALO_MINIMO_S):
        self.sessao = requests.Session()
        self.sessao.headers["User-Agent"] = AGENTE
        self.intervalo = intervalo
        self._ultimo: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}

    def _robots_de(self, url: str):
        host = urlparse(url).scheme + "://" + urlparse(url).netloc
        if host not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.sessao.get(host + "/robots.txt", timeout=TIMEOUT_S)
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                else:
                    rp = None  # sem robots.txt: acesso permitido, com limite de taxa
            except requests.RequestException:
                rp = None
            self._robots[host] = rp
        return self._robots[host]

    def permitido(self, url: str) -> bool:
        rp = self._robots_de(url)
        return True if rp is None else rp.can_fetch(AGENTE, url)

    def _esperar(self, url: str) -> None:
        host = urlparse(url).netloc
        decorrido = time.monotonic() - self._ultimo.get(host, 0.0)
        if decorrido < self.intervalo:
            time.sleep(self.intervalo - decorrido)
        self._ultimo[host] = time.monotonic()

    def obter(self, url: str, tentativas: int = 3) -> requests.Response:
        if not self.permitido(url):
            raise AcessoNegado(f"robots.txt não permite: {url}")
        erro = None
        for n in range(tentativas):
            self._esperar(url)
            try:
                r = self.sessao.get(url, timeout=TIMEOUT_S, stream=True)
                tamanho = int(r.headers.get("Content-Length") or 0)
                if tamanho > TAMANHO_MAXIMO:
                    r.close()
                    raise RuntimeError(f"arquivo excede o limite ({tamanho} bytes): {url}")
                corpo = bytearray()
                for parte in r.iter_content(64 * 1024):
                    corpo.extend(parte)
                    if len(corpo) > TAMANHO_MAXIMO:
                        r.close()
                        raise RuntimeError(f"arquivo excede o limite: {url}")
                r._content = bytes(corpo)
                if r.status_code >= 500:
                    raise requests.HTTPError(f"HTTP {r.status_code}")
                return r
            except (requests.RequestException,) as e:
                erro = e
                time.sleep(2 ** n * self.intervalo)
        raise RuntimeError(f"falha ao obter {url}: {erro}")

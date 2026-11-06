"""(D51) Gera os ícones da PraxIA a partir do logo oficial (docs/marca/praxia-logo-original.png).
O fundo branco vira transparente; o ícone "maskable" e o da Apple mantêm fundo branco.
Uso: python scripts/gerar_icones.py  (requer Pillow: pip install pillow)"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
ORIG = RAIZ / "docs/marca/praxia-logo-original.png"
DEST = RAIZ / "app/icones"
MARCA = RAIZ / "docs/marca"

im = Image.open(ORIG).convert("RGBA")
px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        m = min(r, g, b)
        if m >= 235:
            px[x, y] = (r, g, b, 0)
        elif m >= 200 and max(r, g, b) - m < 25:
            px[x, y] = (r, g, b, int(255 * (235 - m) / 35))
im = im.crop(im.getbbox())
im.save(MARCA / "praxia-logo-transparente.png")


def quadrado(tam, margem, fundo=None):
    base = Image.new("RGBA", (tam, tam), fundo or (0, 0, 0, 0))
    lado = int(tam * (1 - 2 * margem))
    c = im.copy()
    c.thumbnail((lado, lado), Image.LANCZOS)
    base.alpha_composite(c, ((tam - c.width) // 2, (tam - c.height) // 2))
    return base


quadrado(64, 0.02).save(DEST / "icone-64.png")
quadrado(192, 0.04).save(DEST / "icone-192.png")
quadrado(512, 0.04).save(DEST / "icone-512.png")
quadrado(512, 0.16, (255, 255, 255, 255)).save(DEST / "icone-maskable-512.png")  # área segura para recorte
quadrado(180, 0.10, (255, 255, 255, 255)).convert("RGB").save(DEST / "apple-touch-icon.png")
quadrado(96, 0.04).save(MARCA / "praxia-icone-96.png")
print("ícones gerados em", DEST)

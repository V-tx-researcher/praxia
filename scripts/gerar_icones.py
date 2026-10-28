"""Gera os ícones do app (SVG e PNG) no tema escuro: documento claro e lupa dourada.

PNG são necessários para instalar o app no Android, no Chrome/Edge de computador
(192 e 512 px, inclusive versão "maskable" com margem de segurança) e no iPhone
(apple-touch-icon, 180 px). Uso (na raiz): python scripts/gerar_icones.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

DESTINO = Path(__file__).resolve().parents[1] / "app" / "icones"
FUNDO = (13, 17, 23)
PAPEL = (232, 236, 242)
DOBRA = (167, 177, 192)
LINHA = (60, 80, 110)
OURO = (217, 184, 113)

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\
<rect width="64" height="64" rx="12" fill="#0d1117"/>\
<path d="M18 14h19l9 9v27H18z" fill="#e8ecf2"/><path d="M37 14v9h9" fill="#a7b1c0"/>\
<rect x="23" y="29" width="17" height="3" rx="1.5" fill="#3c506e"/>\
<rect x="23" y="35" width="13" height="3" rx="1.5" fill="#3c506e"/>\
<circle cx="43" cy="44" r="7.5" fill="#0d1117" stroke="#d9b871" stroke-width="3"/>\
<path d="M48.5 49.5l5.5 5.5" stroke="#d9b871" stroke-width="3.5" stroke-linecap="round"/></svg>
"""


def desenhar(tamanho: int, margem: float = 0.0, cantos: bool = True) -> Image.Image:
    """Desenha o ícone na grade 64×64, escalado; `margem` reduz o desenho (maskable)."""
    escala_fina = 4  # desenha maior e reduz: bordas suaves
    t = tamanho * escala_fina
    img = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if cantos:
        d.rounded_rectangle([0, 0, t - 1, t - 1], radius=int(t * 12 / 64), fill=FUNDO)
    else:
        d.rectangle([0, 0, t, t], fill=FUNDO)
    k = t * (1 - 2 * margem) / 64
    o = t * margem

    def p(x, y):
        return (o + x * k, o + y * k)

    d.polygon([p(18, 14), p(37, 14), p(46, 23), p(46, 50), p(18, 50)], fill=PAPEL)
    d.polygon([p(37, 14), p(46, 23), p(37, 23)], fill=DOBRA)
    d.rounded_rectangle([*p(23, 29), *p(40, 32)], radius=1.5 * k, fill=LINHA)
    d.rounded_rectangle([*p(23, 35), *p(36, 38)], radius=1.5 * k, fill=LINHA)
    cx, cy, r = 43, 44, 7.5
    d.ellipse([*p(cx - r - 1.5, cy - r - 1.5), *p(cx + r + 1.5, cy + r + 1.5)], fill=OURO)
    d.ellipse([*p(cx - r + 1.5, cy - r + 1.5), *p(cx + r - 1.5, cy + r - 1.5)], fill=FUNDO)
    d.line([p(48.5, 49.5), p(54, 55)], fill=OURO, width=max(1, int(3.5 * k)))
    return img.resize((tamanho, tamanho), Image.LANCZOS)


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    (DESTINO / "icone.svg").write_text(SVG, encoding="utf-8")
    desenhar(192).save(DESTINO / "icone-192.png")
    desenhar(512).save(DESTINO / "icone-512.png")
    # Maskable: fundo cheio e desenho dentro da zona segura (80% central).
    desenhar(512, margem=0.1, cantos=False).save(DESTINO / "icone-maskable-512.png")
    desenhar(180, cantos=False).convert("RGB").save(DESTINO / "apple-touch-icon.png")
    print("ícones gerados em", DESTINO)


if __name__ == "__main__":
    main()

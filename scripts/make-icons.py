#!/usr/bin/env python3
"""Regenerate every icon asset from one square source icon.

Usage:  python3 scripts/make-icons.py [source.png]
        (defaults to assets/images/icon.png)

The source is a square icon: a coloured symbol on the KOZY blue field. Android
adaptive icons need the symbol and the field as separate layers, so the blue is
chroma-keyed out to produce the foreground; the house cut-out stays transparent
and the background layer shows through it, reproducing the original artwork.

Outputs (all derived, safe to regenerate):
  assets/images/android-icon-foreground.png  symbol on transparent, 66% safe area
  assets/images/android-icon-background.png  solid brand blue
  assets/images/android-icon-monochrome.png  white silhouette (Android 13 themed)
  assets/images/favicon.png                  48px web favicon (Expo web)
  website/favicon.png                        48px site favicon
  website/assets/og-icon.png                 512px apple-touch-icon
"""
import sys, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/images/icon.png')

CANVAS = 1024          # Android adaptive layer size
SAFE = 0.66            # symbol must fit the circular/squircle mask
EDGE = 60.0            # chroma-key softness, in RGB distance units

src = Image.open(SRC).convert('RGB')
blue = src.getpixel((2, 2))          # brand field colour, sampled from a corner
print(f'source {src.size} field={blue}')

# --- foreground: chroma-key the field out, un-premultiplying antialiased edges
w, h = src.size
fg = Image.new('RGBA', (w, h))
sp, fp = src.load(), fg.load()
for y in range(h):
    for x in range(w):
        r, g, b = sp[x, y]
        d = ((r - blue[0]) ** 2 + (g - blue[1]) ** 2 + (b - blue[2]) ** 2) ** 0.5
        a = min(1.0, d / EDGE)
        if a <= 0:
            fp[x, y] = (0, 0, 0, 0)
        else:
            # C = a*F + (1-a)*B  ->  F = (C - (1-a)*B) / a
            fp[x, y] = (
                max(0, min(255, int((r - (1 - a) * blue[0]) / a))),
                max(0, min(255, int((g - (1 - a) * blue[1]) / a))),
                max(0, min(255, int((b - (1 - a) * blue[2]) / a))),
                int(a * 255),
            )

# --- scale the symbol into the safe area, centred
bbox = fg.split()[-1].getbbox()
sym = fg.crop(bbox)
target = int(CANVAS * SAFE)
scale = min(target / sym.width, target / sym.height)
sym = sym.resize((round(sym.width * scale), round(sym.height * scale)), Image.LANCZOS)

foreground = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
foreground.paste(sym, ((CANVAS - sym.width) // 2, (CANVAS - sym.height) // 2), sym)

# --- monochrome: same silhouette, painted white (Android tints it)
mono = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 0))
mono.putalpha(foreground.split()[-1])

background = Image.new('RGBA', (CANVAS, CANVAS), blue + (255,))

def save(img, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print(f'  {rel}  {img.size}')

save(foreground, 'assets/images/android-icon-foreground.png')
save(background, 'assets/images/android-icon-background.png')
save(mono,       'assets/images/android-icon-monochrome.png')

fav = src.resize((48, 48), Image.LANCZOS)
save(fav, 'assets/images/favicon.png')
save(fav, 'website/favicon.png')
save(src.resize((512, 512), Image.LANCZOS), 'website/assets/og-icon.png')

print(f'symbol placed at {sym.size} inside {CANVAS} ({100*sym.width/CANVAS:.0f}% wide)')

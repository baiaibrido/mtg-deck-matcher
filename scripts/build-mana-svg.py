# Simboli di mana come disegni vettoriali (v0.39.2): genera src/lib/manaGlyphs.js dal font mana ridotto.
# Ogni simbolo è centrato sul suo ingombro reale, così nel cerchio sta al centro a qualsiasi dimensione
# (con il font, a dimensioni piccole lo schermo arrotondava la posizione e i simboli uscivano storti).
# Uso (dopo npm install, anche per aggiornare mana-font): pip install fonttools brotli && python3 scripts/build-mana-svg.py
import re, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

font = TTFont('node_modules/mana-font/fonts/mana.woff2'); cmap = font.getBestCmap(); gs = font.getGlyphSet()
css = open('node_modules/mana-font/css/mana.css').read()
code = {s: int(c, 16) for s, c in re.findall(r'\.ms-([a-z0-9]+)::before\s*\{\s*content:\s*"\\(e[0-9a-f]{3})"', css)}
NEED = ['w', 'u', 'b', 'r', 'g', 'c', 's', 'x', 'y', 'z', 'p'] + [str(n) for n in range(21)]
EM = 1024
out = {}
for s in NEED:
    g = cmap.get(code.get(s, -1))
    if not g: continue
    bp = BoundsPen(gs); gs[g].draw(bp)
    if not bp.bounds: continue
    x0, y0, x1, y1 = bp.bounds; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    k = 200 / EM  # 1 em = 200 unità (precisione di mezzo centesimo di em), centro dell'ingombro in (0,0), y verso il basso come in SVG
    pen = SVGPathPen(gs, ntos=lambda v: str(round(v)))
    gs[g].draw(TransformPen(pen, (k, 0, 0, -k, -cx * k, cy * k)))
    out[s] = pen.getCommands()
with open('src/lib/manaGlyphs.js', 'w') as f:
    f.write('// Generato da scripts/build-mana-svg.py (mana-font 1.18, MIT): simboli di mana in unità da 200 = 1 em, centrati in (0,0).\n')
    f.write('export const GLYPHS = ' + json.dumps(out, separators=(',', ':')) + '\n')
print(len(out), 'simboli', sum(len(v) for v in out.values()), 'caratteri')

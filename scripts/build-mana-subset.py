# Rigenera src/fonts/mana-cost.woff2 e src/mana-cost.css dal pacchetto mana-font (solo i simboli di costo).
# Uso (dopo un aggiornamento di mana-font): pip install fonttools brotli && python3 scripts/build-mana-subset.py
import re
from fontTools import subset
from fontTools.ttLib import TTFont

css = open('node_modules/mana-font/css/mana.css').read()
NEED = re.compile(r'^(w|u|b|r|g|c|s|x|y|z|e|t|q|p|h|d|l|infinity|chaos|tap|untap|half|\d+|[wubrgc][wubrgc]|2[wubrgc]|[wubrgc]p|[wubrgc][wubrgc]p|cost|split|shadow)$')
out, cps = [], set()
for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
    sel = sel.strip()
    if sel.startswith('@font-face'):
        continue
    keep = [p.strip() for p in sel.split(',') if all(NEED.match(c) for c in re.findall(r'\.ms-([a-z0-9-]+)', p))]
    if not keep or not any(re.search(r'\.ms\b', p) for p in keep):
        continue
    out.append(',\n'.join(keep) + ' {' + body.rstrip() + '\n}')
    cps.update(re.findall(r'content:\s*"\\(e[0-9a-f]{3})"', body))

opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.notdef_outline = True
font = TTFont('node_modules/mana-font/fonts/mana.woff2')  # la stessa versione che il sito usava prima
sub = subset.Subsetter(opts); sub.populate(unicodes=[int(c, 16) for c in cps]); sub.subset(font)
# Il font originale ha il margine sinistro (lsb) a 0 in hmtx: senza questa correzione i simboli escono spostati a sinistra
hm, gl = font['hmtx'].metrics, font['glyf']
for n in hm:
    g = gl[n]; g.recalcBounds(gl)  # i bordi salvati nel font sono sbagliati: si ricalcolano
    if g.numberOfContours:
        hm[n] = (hm[n][0], g.xMin)
font.flavor = 'woff2'; font.save('src/fonts/mana-cost.woff2')

head = '''/* Simboli di mana (mana-font 1.18, MIT): solo i simboli di costo usati dal sito.
   Generato da scripts/build-mana-subset.py: font ridotto da ~400 KB a pochi KB. */
@font-face {
  font-family: "Mana";
  src: url("./fonts/mana-cost.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
'''
open('src/mana-cost.css', 'w').write(head + '\n'.join(out) + '\n')
print(f'{len(cps)} glifi, {len(out)} regole')

import { costSymbols, colorName } from '../lib/deckInfo.js'
import { t } from '../i18n/index.js'
import { GLYPHS } from '../lib/manaGlyphs.js'

// ── Simbolo di mana disegnato (SVG): cerchio e simbolo stanno nello stesso disegno, centrati per costruzione.
// Con il font i simboli piccoli uscivano spostati di 1–3 px (lo schermo arrotonda il testo ma non il cerchio).
// Colori e proporzioni come mana-font: simbolo alto 0,77 del cerchio, numeri 0,6, phyrexiano 0,85, ibridi a metà.
const BG = { w: '#f0f2c0', u: '#b5cde3', b: '#aca29a', r: '#db8664', g: '#93b483', c: '#beb9b2' }
const SPLIT = { w: '#fdfbce', u: '#bcdaf7', b: '#a7999e', r: '#f19b79', g: '#9fcba6', c: '#d0c6bb' }
const EM = 200 // unità per em dei disegni in manaGlyphs.js
const SIZE = { sym: 77, num: 60, phy: 85, half: 40 }
const isNum = s => /^(\d+|[xyz])$/.test(s)
function describe(s) {
  if (isNum(s)) return { bg: BG.c, glyphs: [[s, 0, 0, SIZE.num]] }
  if (/^[wubrgc]$/.test(s)) return { bg: BG[s], glyphs: [[s, 0, 0, SIZE.sym]] }
  if (s === 's') return { bg: BG.c, glyphs: [['s', 0, 0, SIZE.sym]] }
  if (s === 'p') return { bg: BG.c, glyphs: [['p', 0, 0, SIZE.phy]] }
  let m = s.match(/^([wubrg])p$/) // phyrexiano di un colore
  if (m) return { bg: BG[m[1]], glyphs: [['p', 0, 0, SIZE.phy]] }
  m = s.match(/^([wubrgc2])([wubrg])(p?)$/) // ibrido: due colori, 2/colore, incolore/colore, ibrido phyrexiano
  if (m) {
    const [, a, b, phy] = m, top = a === '2' ? 'c' : a
    return { split: [SPLIT[top], SPLIT[b]], glyphs: [[phy ? 'p' : a, -17, -17, SIZE.half], [phy ? 'p' : b, 17, 17, SIZE.half]] }
  }
  return { bg: BG.c, glyphs: [] }
}
export function ManaSymbol({ s, className = '' }) {
  const d = describe(s)
  return (
    <svg className={`msym ${className}`} viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      {d.split ? <><circle r="50" fill={d.split[1]} /><path d="M35.36-35.36A50 50 0 0 0-35.36 35.36Z" fill={d.split[0]} /></> : <circle r="50" fill={d.bg} />}
      {d.glyphs.map(([g, x, y, size], i) => GLYPHS[g] && <path key={i} d={GLYPHS[g]} fill="#111" transform={`translate(${x} ${y}) scale(${size / EM})`} />)}
    </svg>
  )
}

// Costo di mana con i simboli ufficiali (mana-font)
// slot: senza costo (terre) resta una casella vuota, così le righe a griglia non si spostano
export function ManaCost({ cost, size, slot }) {
  const syms = costSymbols(cost)
  if (!syms.length) return slot ? <span className="mana-cost mana-empty" aria-hidden="true" /> : null
  return (
    <span className="mana-cost" style={size ? { fontSize: size } : undefined} role="img" aria-label={t('manaCost', cost)}>
      {syms.map((s, i) => <ManaSymbol key={i} s={s} />)}
    </span>
  )
}

// Identità di colore del mazzo. colors=null → dati in caricamento
export function ColorPips({ colors, size }) {
  if (colors === undefined) return null
  if (colors === null) return <span className="pips pips-loading" aria-label={t('colorsLoading')}><i /><i /></span>
  const list = colors.length ? colors : ['C']
  const splash = colors.splash || []
  const label = !colors.length ? t('colorless')
    : splash.length ? t('colorsSplash', colorName(colors[0]), splash.map(colorName).join(', '))
    : colors.map(colorName).join(', ')
  return (
    <span className="pips" style={size ? { fontSize: size } : undefined} role="img" aria-label={label} title={label}>
      {list.map(c => <ManaSymbol key={c} s={c.toLowerCase()} className={splash.includes(c) ? 'ms-splash' : ''} />)}
    </span>
  )
}

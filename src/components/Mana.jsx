import { costSymbols, colorName } from '../lib/deckInfo.js'
import { t } from '../i18n/index.js'

// Costo di mana con i simboli ufficiali (mana-font)
// slot: senza costo (terre) resta una casella vuota, così le righe a griglia non si spostano
export function ManaCost({ cost, size, slot }) {
  const syms = costSymbols(cost)
  if (!syms.length) return slot ? <span className="mana-cost mana-empty" aria-hidden="true" /> : null
  return (
    <span className="mana-cost" style={size ? { fontSize: size } : undefined} role="img" aria-label={t('manaCost', cost)}>
      {syms.map((s, i) => <i key={i} className={`ms ms-${s} ms-cost${/^(\d+|x|y|z)$/.test(s) ? ' ms-num' : ''}`} />)}
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
      {list.map(c => <i key={c} className={`ms ms-${c.toLowerCase()} ms-cost${splash.includes(c) ? ' ms-splash' : ''}`} />)}
    </span>
  )
}

import { costSymbols, colorName } from '../lib/deckInfo.js'
import { t } from '../i18n/index.js'

// Costo di mana con i simboli ufficiali (mana-font)
export function ManaCost({ cost, size }) {
  const syms = costSymbols(cost)
  if (!syms.length) return null
  return (
    <span className="mana-cost" style={size ? { fontSize: size } : undefined} role="img" aria-label={t('manaCost', cost)}>
      {syms.map((s, i) => <i key={i} className={`ms ms-${s} ms-cost`} />)}
    </span>
  )
}

// Identità di colore del mazzo. colors=null → dati in caricamento
export function ColorPips({ colors, size }) {
  if (colors === undefined) return null
  if (colors === null) return <span className="pips pips-loading" aria-label={t('colorsLoading')}><i /><i /></span>
  const list = colors.length ? colors : ['C']
  const label = colors.length ? colors.map(colorName).join(', ') : t('colorless')
  return (
    <span className="pips" style={size ? { fontSize: size } : undefined} role="img" aria-label={label} title={label}>
      {list.map(c => <i key={c} className={`ms ms-${c.toLowerCase()} ms-cost`} />)}
    </span>
  )
}

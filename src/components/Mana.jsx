import { costSymbols, COLOR_NAME } from '../lib/deckInfo.js'

// Costo di mana con i simboli ufficiali (mana-font)
export function ManaCost({ cost, size }) {
  const syms = costSymbols(cost)
  if (!syms.length) return null
  return (
    <span className="mana-cost" style={size ? { fontSize: size } : undefined} aria-label={`Costo ${cost}`}>
      {syms.map((s, i) => <i key={i} className={`ms ms-${s} ms-cost`} />)}
    </span>
  )
}

// Identità di colore del mazzo. colors=null → dati in caricamento
export function ColorPips({ colors, size }) {
  if (colors === undefined) return null
  if (colors === null) return <span className="pips pips-loading" aria-label="Colori in caricamento"><i /><i /></span>
  const list = colors.length ? colors : ['C']
  const label = colors.length ? colors.map(c => COLOR_NAME[c]).join(', ') : 'Incolore'
  return (
    <span className="pips" style={size ? { fontSize: size } : undefined} role="img" aria-label={label} title={label}>
      {list.map(c => <i key={c} className={`ms ms-${c.toLowerCase()} ms-cost`} />)}
    </span>
  )
}

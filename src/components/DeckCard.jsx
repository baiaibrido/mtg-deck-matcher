const pct = r => Math.round(r * 100)
export const Bar = ({ ratio, label }) => (
  <div className="bar"><span style={{ width: `${pct(ratio)}%` }} /><em>{label} {pct(ratio)}%</em></div>
)

export default function DeckCard({ s, rank, onOpen }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  return (
    <button className="deck-card" onClick={onOpen}>
      <div className="deck-head"><b>#{rank}</b><h3>{s.deck.name}{s.deck.share > 0 && <small> · {s.deck.share}% meta</small>}</h3><strong>{pct(s.score)}</strong></div>
      <Bar ratio={s.main.ratio} label={`Main ${s.main.have}/${s.main.total}`} />
      {s.side.total > 0 && <Bar ratio={s.side.ratio} label={`Side ${s.side.have}/${s.side.total}`} />}
      <small>{missing ? `Mancano ${missing} carte` : 'Mazzo completo ✓'}</small>
    </button>
  )
}

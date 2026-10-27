// Mini linea (presenza o numero di mazzi per settimana); solo decorativa, i valori sono nel testo
export default function Spark({ values, w = 72, h = 20, className = '' }) {
  const pts = (values || []).map((v, i) => [i, v]).filter(([, v]) => v != null)
  if (pts.length < 2) return null
  const n = values.length - 1, max = Math.max(...pts.map(p => p[1])), min = Math.min(...pts.map(p => p[1]))
  const y = v => h - 2 - (max === min ? (h - 4) / 2 : (v - min) / (max - min) * (h - 4))
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${(i / n * (w - 2) + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return <svg className={`st-spark ${className}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} /></svg>
}


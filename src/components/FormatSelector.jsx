export default function FormatSelector({ formats, value, onChange }) {
  return (
    <select className="format" value={value} onChange={e => onChange(e.target.value)}>
      {formats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  )
}

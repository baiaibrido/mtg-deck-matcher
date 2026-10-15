import { useState } from 'react'
import { t } from '../i18n/index.js'

// Azione distruttiva con conferma nello stile del sito (al posto della finestra confirm() del browser)
export default function ConfirmButton({ label, question, yes, onConfirm, className = '' }) {
  const [asking, setAsking] = useState(false)
  if (!asking) return <button className={className} onClick={() => setAsking(true)}>{label}</button>
  return (
    <span className="confirm" role="alertdialog" aria-label={question}>
      <span className="confirm-q">{question}</span>
      <button className="btn btn-danger" autoFocus onClick={() => { setAsking(false); onConfirm() }}>{yes}</button>
      <button className="btn btn-quiet" onClick={() => setAsking(false)}>{t('cancel')}</button>
    </span>
  )
}

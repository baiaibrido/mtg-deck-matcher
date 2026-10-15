import { useEffect, useRef } from 'react'
import { t } from '../i18n/index.js'

// Finestra centrata (elemento <dialog>: tastiera, Esc e focus gestiti dal browser), con chiusura animata
export default function Modal({ open, onClose, label, children, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (open && !d.open) { d.showModal(); document.documentElement.classList.add('modal-open') }
    if (!open && d.open) d.close()
    return () => document.documentElement.classList.remove('modal-open')
  }, [open])
  const close = () => {
    const d = ref.current
    if (!d || matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    d.classList.add('closing'); setTimeout(() => { d.classList.remove('closing'); onClose() }, 180)
  }
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-label={label}
      onCancel={e => { e.preventDefault(); close() }} onClick={e => { if (e.target === ref.current) close() }}>
      {open && <div className="modal-body">
        <button className="modal-x" onClick={close} aria-label={t('close')} title={t('close')}>×</button>
        {children(close)}
      </div>}
    </dialog>
  )
}

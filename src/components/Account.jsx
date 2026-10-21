import { useState } from 'react'
import { t } from '../i18n/index.js'
import { linkProps } from '../state/useRoute.js'
import { cardCount } from '../lib/sync.js'
import ConfirmButton from './ConfirmButton.jsx'
import { IconCloud, IconGoogle, IconUser } from './Icons.jsx'

const ERR = { signin: 'acc.err', link: 'acc.errLink', recent: 'acc.recent', delete: 'acc.err', send: 'acc.errSend' }

// Scelta quando profilo e dispositivo hanno collezioni diverse
export function ConflictBox({ acc, local }) {
  if (!acc.conflict) return null
  return (
    <div className="confirm acc-conflict" role="alertdialog" aria-label={t('acc.conflictTitle')}>
      <p className="confirm-q">{t('acc.conflict', cardCount(acc.conflict.remote || []), cardCount(local))}</p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => acc.resolve('merge')}>{t('acc.merge')}</button>
        <button className="btn" onClick={() => acc.resolve('profile')}>{t('acc.useProfile')}</button>
        <button className="btn" onClick={() => acc.resolve('device')}>{t('acc.useDevice')}</button>
      </div>
      <p className="hint">{t('acc.mergeHint')}</p>
    </div>
  )
}

// Contenuto della finestra «Il tuo profilo»
export function AccountPanel({ acc, local, onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const send = async e => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try { await acc.sendLink(email.trim()); setSent(email.trim()) } catch { acc.setError('send') }
    setBusy(false)
  }
  const privacy = <p className="hint acc-privacy">{t('acc.privacyNote')} <a {...linkProps('privacy')} onClick={e => { linkProps('privacy').onClick(e); onClose?.() }}>{t('privacy.title')}</a></p>
  const err = acc.error && <p className="note note-error" role="alert">{t(ERR[acc.error] || 'acc.err')}</p>

  if (acc.needEmail) return (
    <div className="acc">
      <h2 className="acc-title">{t('acc.title')}</h2>
      <p className="acc-text">{t('acc.needEmail')}</p>
      <form className="acc-email" onSubmit={e => { e.preventDefault(); if (email.trim()) acc.completeLink(email.trim()) }}>
        <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('acc.email')} aria-label={t('acc.email')} />
        <button className="btn btn-primary">{t('acc.finish')}</button>
      </form>
      {err}
    </div>
  )

  if (acc.state === 'in') return (
    <div className="acc">
      <h2 className="acc-title">{t('acc.title')}</h2>
      <p className="acc-who"><IconUser size={18} /><span>{t('acc.in', acc.user.email)}</span></p>
      <SyncState sync={acc.sync} />
      <ConflictBox acc={acc} local={local} />
      <div className="row acc-actions">
        <button className="btn" onClick={() => { acc.signOut(); onClose?.() }}>{t('acc.out')}</button>
        <ConfirmButton className="btn btn-quiet btn-danger" label={t('acc.delete')} question={t('acc.deleteQ')} yes={t('acc.deleteYes')} onConfirm={acc.remove} />
      </div>
      <p className="hint">{t('acc.outNote')}</p>
      {err}
      {privacy}
    </div>
  )

  return (
    <div className="acc">
      <h2 className="acc-title">{t('acc.pitch')}</h2>
      <p className="acc-text">{t('acc.why')}</p>
      <button className="btn btn-primary acc-google" onClick={acc.signInGoogle} disabled={acc.state === 'loading'}><IconGoogle size={18} />{t('acc.google')}</button>
      <p className="acc-or">{t('acc.or')}</p>
      {sent ? <p className="note" role="status">{t('acc.sent', sent)}</p> : (
        <form className="acc-email" onSubmit={send}>
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('acc.email')} aria-label={t('acc.email')} />
          <button className="btn" disabled={busy}>{t('acc.send')}</button>
        </form>
      )}
      {err}
      {privacy}
    </div>
  )
}

function SyncState({ sync }) {
  if (sync === 'idle') return null
  return <p className={`acc-sync acc-sync-${sync}`} role="status"><IconCloud size={18} />{t(`acc.sync.${sync}`)}</p>
}

// Riga nella pagina Collezione: invito ad accedere, oppure con chi è sincronizzata
export function SyncLine({ acc, local, onOpen }) {
  if (acc.state === 'loading') return null
  return <>
    <div className={`sync-line${acc.state === 'in' ? ' on' : ''}`}>
      <IconCloud size={20} />
      <p>{acc.state === 'in' ? <>{t('acc.line.in', acc.user.email)}{acc.sync !== 'idle' && <span className="sync-state"> {t(`acc.sync.${acc.sync}`)}</span>}</> : t('acc.line.out')}</p>
      <button className="btn" onClick={onOpen}>{acc.state === 'in' ? t('acc.account') : t('acc.signin')}</button>
    </div>
    <ConflictBox acc={acc} local={local} />
  </>
}

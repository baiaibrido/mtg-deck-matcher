import { useMemo, useState } from 'react'
import { keyCards } from '../lib/keyCards.js'
import { getCached } from '../lib/scryfall.js'
import { t, euro } from '../i18n/index.js'
import { toText, downloadTxt } from '../lib/export.js'
import { ManaCost } from './Mana.jsx'
import { IconCopy, IconDownload } from './Icons.jsx'
import { go } from '../state/useRoute.js'

// Carte che ti mancano e che servono a più mazzi del formato: i primi acquisti che rendono di più.
export default function KeyCards({ ranked, formatName, hasCollection, toast }) {
  const [scope, setScope] = useState('t12')
  const pool = useMemo(() => scope === 'all' ? ranked : ranked.filter(s => !s.deck.tier || s.deck.tier <= 2 && (scope === 't12' || s.deck.tier === 1)), [ranked, scope])
  const list = useMemo(() => keyCards(pool), [pool])
  const rows = list.map(e => ({ ...e, card: getCached(e.name) }))
  const total = rows.reduce((t, e) => t + (e.card?.eur ?? 0) * e.maxMissing, 0)
  const text = toText(rows.map(e => ({ name: e.name, missing: e.maxMissing })))

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast(t('kc.copied')) } catch { toast(t('copyFail')) }
  }

  return (
    <div className="keycards">
      <header className="page-head">
        <h1>{t('kc.title', formatName)}</h1>
        <p>{t('kc.intro')}</p>
      </header>

      {!hasCollection && <div className="callout"><p><b>{t('kc.loadB')}</b>{t('kc.load')}</p><a className="btn btn-primary" href="#/collezione">{t('loadCollection')}</a></div>}

      <div className="seg" role="tablist" aria-label={t('kc.scope')}>
        <button role="tab" aria-selected={scope === 't1'} onClick={() => setScope('t1')}>Tier 1</button>
        <button role="tab" aria-selected={scope === 't12'} onClick={() => setScope('t12')}>{t('kc.t12')}</button>
        <button role="tab" aria-selected={scope === 'all'} onClick={() => setScope('all')}>{t('all')}</button>
      </div>

      {rows.length ? <>
        <ol className="key-list">
          {rows.map((e, i) => (
            <li key={e.name} style={{ '--i': Math.min(i, 10) }}>
              <span className="key-rank">{i + 1}</span>
              <span className="key-main">
                <span className="key-name">
                  <a href={e.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${e.name}"`)}`} target="_blank" rel="noreferrer">{e.name}</a>
                  <ManaCost cost={e.card?.cost} />
                </span>
                <span className="key-decks">
                  {t('kc.inDecks', e.decks.length)}{' '}
                  {e.decks.slice(0, 4).map((d, j) => (
                    <span key={d.id}>{j > 0 && ', '}<button className="linklike" onClick={() => go('mazzo', d.id)}>{d.name}</button></span>
                  ))}
                  {e.decks.length > 4 && t('kc.more', e.decks.length - 4)}
                </span>
              </span>
              <span className="key-buy">
                <b>{e.maxMissing}×</b>
                <span>{e.card?.eur != null ? euro(e.card.eur * e.maxMissing, true) : '—'}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="actions">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />{t('copyList')}</button>
          <button className="btn" onClick={() => downloadTxt(`${t('kc.file')}-${formatName.toLowerCase()}.txt`, text)}><IconDownload size={18} />{t('download')}</button>
          {total > 0 && <span className="key-total">{t('kc.total')} ≈ {euro(total)}</span>}
        </div>
      </> : <p className="empty">{hasCollection ? t('kc.none') : t('kc.noData')}</p>}

      <p className="hint">{t('kc.hint')}</p>
    </div>
  )
}

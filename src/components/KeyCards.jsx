import { useMemo, useState } from 'react'
import { keyCards } from '../lib/keyCards.js'
import { getCached } from '../lib/scryfall.js'
import { t } from '../i18n/index.js'
import { money, priceOf } from '../lib/currency.js'
import { toText, downloadTxt } from '../lib/export.js'
import { ManaCost } from './Mana.jsx'
import { IconCopy, IconDownload, IconGrid, IconList, IconCheck } from './Icons.jsx'
import { toOwnedMap } from '../lib/matcher.js'
import { norm } from '../lib/normalize.js'
import { useLocal } from '../state/useLocal.js'
import { go } from '../state/useRoute.js'

// Carte che ti mancano e che servono a più mazzi del formato: i primi acquisti che rendono di più.
export default function KeyCards({ ranked, formatName, collection, playset, toast }) {
  const [scope, setScope] = useState('t12')
  const [look, setLook] = useLocal('mdm.kcView', 'list')
  const hasCollection = collection.length > 0
  const owned = useMemo(() => toOwnedMap(collection), [collection])
  const pool = useMemo(() => scope === 'all' ? ranked : ranked.filter(s => !s.deck.tier || s.deck.tier <= 2 && (scope === 't12' || s.deck.tier === 1)), [ranked, scope])
  const list = useMemo(() => keyCards(pool), [pool])
  // copie possedute e mancanti rispetto a un playset (4 copie, 1 in Commander)
  const rows = list.map(e => {
    const have = owned.get(norm(e.name)) || 0 // anche più di un playset
    return { ...e, card: getCached(e.name), have, need: Math.max(0, playset - have) }
  })
  const total = rows.reduce((s, e) => s + (priceOf(e.card) ?? 0) * e.need, 0)
  const text = toText(rows.filter(e => e.need).map(e => ({ name: e.name, missing: e.need })))
  const st = e => e.need === 0 ? 'ok' : e.have === 0 ? 'no' : 'part'
  const scry = e => e.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${e.name}"`)}`
  const ownText = e => e.need ? t('kc.own', e.have, playset, e.need) : t('kc.ownFull', e.have)
  const price = e => priceOf(e.card) != null ? money(priceOf(e.card) * e.need, true) : '—'

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast(t('kc.copied')) } catch { toast(t('copyFail')) }
  }

  return (
    <div className="keycards">
      <header className="page-head">
        <h1>{t('kc.title', formatName)}</h1>
        <p>{t('kc.intro')}</p>
      </header>

      {!hasCollection && <div className="callout"><p><b>{t('kc.loadB')}</b>{t('kc.load')}</p><a className="btn btn-primary" href="#/collection">{t('loadCollection')}</a></div>}

      <div className="list-tools">
      <div className="chips" role="group" aria-label={t('kc.scope')}>
        <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>{t('allTiers')}</button>
        <button aria-pressed={scope === 't1'} onClick={() => setScope('t1')}>Tier 1</button>
        <button aria-pressed={scope === 't12'} onClick={() => setScope('t12')}>{t('kc.t12')}</button>
      </div>
      <div className="seg seg-icons" role="group" aria-label={t('view')}>
        <button aria-pressed={look !== 'cards'} onClick={() => setLook('list')} title={t('coll.list')}><IconList size={18} /><span className="sr-only">{t('coll.list')}</span></button>
        <button aria-pressed={look === 'cards'} onClick={() => setLook('cards')} title={t('view.cards')}><IconGrid size={18} /><span className="sr-only">{t('view.cards')}</span></button>
      </div>
      </div>

      {rows.length ? <>
        <div className="actions actions-top">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />{t('copyList')}</button>
          <button className="btn" onClick={() => downloadTxt(`${t('kc.file')}-${formatName.toLowerCase()}.txt`, text)}><IconDownload size={18} />{t('download')}</button>
          {total > 0 && <span className="key-total">{t('detail.total')} ≈ {money(total)}</span>}
        </div>
        {look === 'cards' ? (
          <ol className="key-tiles">
            {rows.map((e, i) => (
              <li key={e.name}>
                <a className={`tile tile-${st(e)}`} href={scry(e)} target="_blank" rel="noreferrer" title={`${e.name} — ${ownText(e)}`}>
                  {e.card?.img ? <img src={e.card.img} alt={e.name} loading="lazy" /> : <span className="tile-ph"><span>{e.name}</span><ManaCost cost={e.card?.cost} /></span>}
                  <span className="key-tile-rank">{i + 1}</span>
                  <span className="tile-qty">{st(e) === 'ok' ? <><IconCheck size={13} />{e.have}</> : `${e.have}/${playset}`}</span>
                </a>
                <span className="key-tile-info">{t('kc.inN', e.decks.length)}{e.need > 0 && <> · <b>{t('kc.need', e.need)}</b> {price(e)}</>}</span>
              </li>
            ))}
          </ol>
        ) : (
        <ol className="key-list">
          {rows.map((e, i) => (
            <li key={e.name} style={{ '--i': Math.min(i, 10) }}>
              <span className="key-rank">{i + 1}</span>
              <span className="key-main">
                <span className="key-name">
                  <a href={scry(e)} target="_blank" rel="noreferrer">{e.name}</a>
                  <ManaCost cost={e.card?.cost} />
                </span>
                <span className="key-decks">
                  {t('kc.inDecks', e.decks.length)}{' '}
                  {e.decks.slice(0, 4).map((d, j) => (
                    <span key={d.id}>{j > 0 && ', '}<button className="linklike" onClick={() => go('deck', d.id)}>{d.name}</button></span>
                  ))}
                  {e.decks.length > 4 && t('kc.more', e.decks.length - 4)}
                </span>
                <span className={`key-own tile-${st(e)}`}>{st(e) === 'ok' && <IconCheck size={14} />}{ownText(e)}</span>
              </span>
              <span className="key-buy">{e.need > 0 && <><b>{e.need}×</b><span>{price(e)}</span></>}</span>
            </li>
          ))}
        </ol>
        )}
      </> : <p className="empty">{hasCollection ? t('kc.none') : t('kc.noData')}</p>}

      <p className="hint">{t('kc.hint')}</p>
    </div>
  )
}

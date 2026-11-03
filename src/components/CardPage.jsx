import { Fragment, useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import Picker from './Picker.jsx'
import { ManaCost, ManaSymbol } from './Mana.jsx'
import { Info } from './Badges.jsx'
import { IconExternal } from './Icons.jsx'
import { t, num } from '../i18n/index.js'
import { money, priceOf } from '../lib/currency.js'
import { fetchCardFull, fetchPrints, printOf, metaUsage } from '../lib/cardInfo.js'

// Testo della carta con i simboli disegnati ({T}, {2}{U}…) e i paragrafi
function OracleText({ text }) {
  if (!text) return null
  return text.split('\n').map((line, i) => (
    <p key={i}>{line.split(/(\{[^}]+\})/g).map((part, j) => {
      const m = /^\{([^}]+)\}$/.exec(part)
      return m ? <Fragment key={j}><ManaSymbol s={m[1].replace(/\//g, '').toLowerCase()} className="cp-sym" /><span className="sr-only">{part}</span></Fragment> : <Fragment key={j}>{part}</Fragment>
    })}</p>
  ))
}

function Face({ f }) {
  return <div className="cp-face">
    <h3 className="cp-face-name">{f.name} <ManaCost cost={f.mana_cost} /></h3>
    <p className="cp-type">{f.type_line}</p>
    <div className="cp-text"><OracleText text={f.oracle_text} /></div>
    {(f.power != null || f.loyalty != null) && <p className="cp-pt">{f.loyalty != null ? f.loyalty : `${f.power}/${f.toughness}`}</p>}
  </div>
}

const LEGAL = { legal: 'cp.legal', not_legal: 'cp.notLegal', banned: 'cp.banned', restricted: 'cp.restricted' }

// La scheda della carta, come la pagina di Scryfall ma nel sito: testo completo, versioni, legalità e quanto è giocata nel meta.
// req: { name, sid?, set?, num? } (la stampa della collezione). children: comandi in più (quantità in collezione).
export default function CardPage({ req, onClose, formats = [], children }) {
  const [card, setCard] = useState(null)
  const [err, setErr] = useState(false)
  const [prints, setPrints] = useState([])
  const [pick, setPick] = useState(null)
  const [flip, setFlip] = useState(false)
  const [usage, setUsage] = useState(null)
  useEffect(() => {
    if (!req) return
    let alive = true
    setCard(null); setErr(false); setPrints([]); setPick(null); setFlip(false); setUsage(null)
    fetchCardFull(req).catch(() => req.set || req.sid ? fetchCardFull({ name: req.name }) : Promise.reject())
      .then(c => { if (!alive) return; setCard(c); setPick(c.id); return fetchPrints(c).then(p => alive && setPrints(p)) })
      .catch(() => alive && setErr(true))
    metaUsage(formats.map(f => f.id), req.name).then(u => alive && setUsage(u))
    return () => { alive = false }
  }, [req?.name, req?.sid, req?.set, req?.num, formats.length])

  const cur = card && (prints.find(p => p.id === pick) || printOf(card))
  const faces = card?.card_faces?.length && !card.oracle_text ? card.card_faces : card ? [card] : []
  const price = cur && priceOf(cur)
  return (
    <Modal open={!!req} onClose={onClose} label={req?.name || ''} className="modal-wide card-page">
      {() => !card ? <p className={err ? 'note note-error' : 'hint'} role="status">{t(err ? 'cp.error' : 'cp.loading')}</p> : <>
        <div className="cp">
          <div className="cp-img">
            {cur?.img && <img src={flip && cur.back ? cur.back : cur.img} alt={card.name} />}
            {cur?.back && <button className="btn btn-quiet cp-flip" onClick={() => setFlip(f => !f)}>{t(flip ? 'cp.front' : 'cp.back')}</button>}
          </div>
          <div className="cp-info">
            {faces.map((f, i) => <Face key={i} f={f} />)}
            <div className="cp-print">
              {prints.length > 1 && <span className="field">
                <span className="field-label">{t('cp.version')}</span>
                <Picker label={t('cp.version')} value={pick} onChange={setPick}
                  options={prints.map(p => ({ value: p.id, label: `${p.setName} (${p.set.toUpperCase()}) #${p.num}${p.year ? `, ${p.year}` : ''}` }))} />
              </span>}
              <p className="cp-meta">
                {prints.length <= 1 && cur && <span>{cur.setName} ({cur.set?.toUpperCase()}) #{cur.num}{cur.year ? `, ${cur.year}` : ''}</span>}
                {cur?.artist && <span>{t('cp.artist', cur.artist)}</span>}
                {['common', 'uncommon', 'rare', 'mythic', 'special'].includes(cur?.rarity) && <span>{t(`rarity.${cur.rarity}`)}</span>}
                {price != null && <span className="cp-price">{money(price, true)}</span>}
              </p>
            </div>
            {children}
            <a className="cp-link" href={cur?.uri || card.scryfall_uri} target="_blank" rel="noreferrer">{t('coll.openScry')}<IconExternal size={14} /></a>
          </div>
        </div>

        {/* per ogni formato del sito: legalità e quanto è giocata nelle liste dei tornei degli ultimi due mesi */}
        <section className="cp-formats" aria-labelledby="cp-formats-title">
          <h3 id="cp-formats-title">{t('cp.formats')} <Info text={t('cp.metaNote')} label={t('info.label')} /></h3>
          <table>
            <thead><tr><th scope="col">{t('format')}</th><th scope="col">{t('cp.legality')}</th><th scope="col">{t('cp.meta')}</th></tr></thead>
            <tbody>{formats.map(f => {
              const st = card.legalities?.[f.id] || 'not_legal', u = usage?.[f.id]
              return <tr key={f.id}>
                <th scope="row">{f.name}</th>
                <td><span className={`cp-legal cp-legal-${st}`}>{t(LEGAL[st] || 'cp.notLegal')}</span></td>
                <td>{!usage ? '…' : !u || !u.n ? <span className="cp-none">{t('cp.none')}</span> : <>
                  <b>{t('cp.share', num(u.share))}</b> <span className="cp-n">{t('cp.decks', u.n, u.total)}</span>
                  {u.trend != null && u.trend !== 0 && <span className={`st-delta ${u.trend > 0 ? 'up' : 'down'}`}> {u.trend > 0 ? '+' : '−'}{t('st.pts', num(Math.abs(u.trend)))}</span>}
                </>}</td>
              </tr>
            })}</tbody>
          </table>
        </section>
      </>}
    </Modal>
  )
}

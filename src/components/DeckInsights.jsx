import { t, num } from '../i18n/index.js'
import { coreWithOwned, sideAgainst } from '../lib/stats.js'
import { IconCheck } from './Icons.jsx'
import { hoverProps } from './DeckDetail.jsx'

// Nel dettaglio mazzo (colonna destra): conversione in top 8, cuore della lista / posti liberi, side contro di te
export const ConvLine = ({ deck }) => deck.conv ? <p className="ins-conv">🏁 {t('ins.conv', num(deck.conv[1]), num(deck.conv[0]), num(Math.round(deck.conv[1] / deck.conv[0] * 10) / 10))}</p> : null

export default function DeckInsights({ deck, decks, owned, onOpen, idOf }) {
  const cw = coreWithOwned(deck, owned)
  const sa = sideAgainst(deck, decks)
  const hasColl = owned.size > 0
  const own = (have, qty) => <span className={`ins-own ${have >= qty ? 'ok' : have ? 'part' : 'no'}`}>{have >= qty ? <IconCheck size={12} /> : `${have}/${qty}`}</span>
  return <>
    {cw && <section className="ins" aria-labelledby="core-title">
      <h2 id="core-title">{t('ins.core')}</h2>
      <p className="ins-note">{t('ins.core.intro', num(cw.lists))}{hasColl && (cw.missing ? ` ${t('ins.core.missing', cw.missing)}` : ` ${t('ins.core.have')}`)}</p>
      <ul className="ins-list">
        {cw.core.map(c => <li key={c.name}><span className="ins-q">{c.qty}</span><span className="ins-n" {...hoverProps(c.name)}>{c.name}</span>{hasColl && own(c.have, c.qty)}</li>)}
        {cw.basics.length > 0 && <li className="ins-basics"><span className="ins-q" /><span className="ins-n">{cw.basics.map(([n, q]) => `${q} ${n}`).join(', ')}</span></li>}
      </ul>
      {cw.flex.length > 0 && <>
        <h3>{t('ins.flex')}</h3>
        <p className="ins-note">{t('ins.flex.intro')}</p>
        <ul className="ins-list ins-flex">
          {cw.flex.map(f => <li key={f.name}><span className="ins-pct" style={{ '--p': f.pct }}>{f.pct}%</span><span className="ins-n" {...hoverProps(f.name)}>{f.name}</span><span className="ins-avg">×{num(f.avg)}</span>{hasColl && f.have > 0 && <span className="ins-own ok"><IconCheck size={12} /></span>}</li>)}
        </ul>
      </>}
    </section>}

    {sa.cards.length > 0 && <section className="ins" aria-labelledby="sa-title">
      <h2 id="sa-title">{t('ins.side')}</h2>
      <p className="ins-note">{t('ins.side.intro')} {sa.opponents.slice(0, 4).map((n, i, a) => { const id = idOf(n); return <span key={n}>{i > 0 && ' '}<span className="nb">{id ? <button className="linklike" onClick={() => onOpen(id)}>{n}</button> : n}{i < a.length - 1 && ','}</span></span> })}{sa.opponents.length > 4 && ` ${t('kc.more', sa.opponents.length - 4)}`}.</p>
      <ul className="ins-list">
        {sa.cards.map(c => <li key={c.name}><span className="ins-q" aria-hidden="true">•</span><span className="ins-n" {...hoverProps(c.name)}>{c.name}</span><span className="ins-avg">{t('ins.side.n', c.n, sa.opponents.length)}</span></li>)}
      </ul>
      <p className="hint">{t('ins.side.hint')}</p>
    </section>}
  </>
}

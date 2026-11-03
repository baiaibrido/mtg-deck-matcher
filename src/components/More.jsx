import { useState } from 'react'
import { t } from '../i18n/index.js'
import { Info } from './Badges.jsx'

// Le prime righe di un elenco e «Mostra tutti»: prima le cose più utili, il resto a richiesta
export function More({ items, n = 5, children }) {
  const [all, setAll] = useState(false)
  return <>
    {children(all ? items : items.slice(0, n))}
    {items.length > n && <button className="linklike st-more" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? t('wx.less') : t('mu.showAll', items.length)}</button>}
  </>
}

// Titolo di un riquadro con la spiegazione dietro il «?»
export const PanelTitle = ({ children, info }) => <h2>{children}{info && <> <Info text={info} label={t('info.label')} /></>}</h2>

import { useEffect, useRef, useState } from 'react'
import { t, LANGS, locale } from '../i18n/index.js'
import { CURRENCIES, currencySymbol } from '../lib/currency.js'
import { linkProps } from '../state/useRoute.js'
import { useMedia } from '../state/useMedia.js'
import Picker from './Picker.jsx'
import { IconDecks, IconBox, IconKey, IconSun, IconMoon, IconGlobe, IconCoins, IconChart } from './Icons.jsx'

const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

// Testata sempre visibile: si compatta scorrendo (soglie diverse in su e in giù per non sfarfallare)
export function TopBar({ current, count, lang, onLang, cur, onCur, theme, onTheme }) {
  const headRef = useRef(null)
  const [compact, setCompact] = useState(false)
  const narrow = useMedia('(max-width: 999px)') // schermi stretti: nei selettori solo i codici (IT, EUR…)
  useEffect(() => {
    const on = () => setCompact(c => c ? scrollY > 8 : scrollY > 40)
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  useEffect(() => { // altezza della testata per gli altri elementi fissi e per lo scorrimento alle sezioni
    const el = headRef.current; if (!el) return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--head-h', `${el.offsetHeight}px`))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  return (
    <header className={`topbar${compact ? ' compact' : ''}`} ref={headRef}>
      <a className="brand" {...linkProps('decks')} aria-label={t('home')}>
        <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
        <span className="brand-name">Netdeckable</span>
      </a>
      <nav className="nav-top" aria-label={t('sections')}>
        <a {...linkProps('decks')} aria-current={current('decks')}>{t('nav.decks')}</a>
        <a {...linkProps('collection')} aria-current={current('collection')}>{t('nav.collection')} <span className="count">{count.toLocaleString(lang)}</span></a>
        <a {...linkProps('key-cards')} aria-current={current('key-cards')}>{t('nav.keycards')}</a>
        <a {...linkProps('stats')} aria-current={current('stats')}>{t('nav.stats')}</a>
      </nav>
      <div className="prefs">
        <Picker className="pref-picker" label={t('language')} icon={<IconGlobe size={17} />} align="right" short={narrow}
          value={lang} onChange={onLang} options={LANGS.map(([k, name]) => ({ value: k, label: name, short: k.toUpperCase(), lang: k }))} />
        <Picker className="pref-picker" label={t('currency')} icon={<IconCoins size={17} />} align="right" short={narrow}
          value={cur} onChange={onCur} options={CURRENCIES.map(c => { const sym = currencySymbol(c, locale()); return { value: c, label: !sym || sym === c ? c : `${c} ${sym}`, short: c } })} />
        <button className="theme-btn" onClick={() => onTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? t('theme.toDark') : t('theme.toLight')} title={theme === 'light' ? t('theme.toDark') : t('theme.toLight')}>
          {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
        </button>
      </div>
    </header>
  )
}

// Barra delle sezioni in basso (solo telefono)
export function TabBar({ current }) {
  return (
    <nav className="tabbar" aria-label={t('sections')}>
      <a {...linkProps('decks')} aria-current={current('decks')}><IconDecks />{t('nav.decks')}</a>
      <a {...linkProps('collection')} aria-current={current('collection')}><IconBox />{t('nav.collection')}</a>
      <a {...linkProps('key-cards')} aria-current={current('key-cards')}><IconKey />{t('nav.keycards')}</a>
      <a {...linkProps('stats')} aria-current={current('stats')}><IconChart />{t('nav.stats')}</a>
    </nav>
  )
}

// Linguette dei formati: su telefono la fila scorre e il formato scelto resta sempre visibile
export function FormatTabs({ formats, format, onChange }) {
  const row = useRef(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = row.current, b = el?.querySelector('[aria-selected="true"]')
      if (el && b && el.scrollWidth > el.clientWidth) el.scrollTo({ left: b.offsetLeft - el.offsetLeft - (el.clientWidth - b.offsetWidth) / 2 })
    })
    return () => cancelAnimationFrame(id)
  }, [format, formats])
  return (
    <div className="formats" role="tablist" aria-label={t('format')} ref={row}>
      {formats.map(f => <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => onChange(f.id)}>{f.name}</button>)}
    </div>
  )
}

// "Torna su" dopo circa due schermate
export function ToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(scrollY > innerHeight * 1.5)
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <button className={`to-top${show ? ' show' : ''}`} onClick={() => scrollTo({ top: 0, behavior: smooth() })}
      aria-label={t('toTop')} title={t('toTop')} tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="footer-credits">
        {t('footer.lists')}: <a href="https://github.com/Jiliac/MTGODecklistCache" target="_blank" rel="noreferrer">MTGODecklistCache</a>, <a href="https://www.mtgtop8.com" target="_blank" rel="noreferrer">MTGTop8</a>
        {' · '}{t('footer.archetypes')}: <a href="https://github.com/Badaro/MTGOFormatData" target="_blank" rel="noreferrer">MTGOFormatData</a>
        {' · '}{t('footer.cards')}: <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>
        {' · '}{t('footer.rates')}: <a href="https://www.ecb.europa.eu" target="_blank" rel="noreferrer">BCE/ECB</a>
        {' · '}{t('footer.tiers')}
      </p>
      {/* testo richiesto dalla Fan Content Policy di Wizards of the Coast (in inglese, come da policy) */}
      <p className="footer-legal" lang="en">
        Netdeckable is unofficial Fan Content permitted under the <a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank" rel="noreferrer">Fan Content Policy</a>. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
      </p>
      <p>Netdeckable v{__APP_VERSION__}</p>
    </footer>
  )
}

// Avviso in basso (con eventuale "Annulla")
export function ToastZone({ msg, toast }) {
  // la zona sta nello "strato superiore" del browser: l'avviso resta visibile anche sopra le finestre dei giochi
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!msg || !el?.showPopover) return
    try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover() } catch { /* non supportato */ }
  }, [msg])
  return (
    <div className="toast-zone" aria-live="polite" ref={ref} popover="manual">
      {msg && (
        <div className={`toast${msg.action ? ' toast-action' : ''}`} key={msg.id}>
          {msg.text}
          {msg.action && <button onClick={() => { msg.action.fn(); toast(t('done'), null, true) }}>{msg.action.label}</button>}
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'
import { t } from '../i18n/index.js'

// Titolo e descrizione della scheda del browser (e di Google) per ogni pagina, più l'indirizzo canonico
export function usePageMeta({ page, deck, formatName, lang }) {
  useEffect(() => {
    if (!formatName && page !== 'collection' && page !== 'privacy') return
    const title = page === 'deck' && deck ? `${deck.name} — ${formatName}` : page === 'key-cards' ? t('kc.title', formatName)
      : page === 'stats' ? t('st.title', formatName) : page === 'collection' ? t('coll.title') : page === 'privacy' ? t('privacy.title') : t('decks.title.share', formatName)
    document.title = `${title} · Netdeckable`
    const desc = page === 'deck' && deck ? t('seo.deck', deck.name, formatName) : t('seo.home', formatName)
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    let canon = document.querySelector('link[rel="canonical"]')
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.append(canon) }
    canon.href = location.origin + location.pathname
  }, [page, deck?.id, formatName, lang])
}

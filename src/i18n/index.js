// Traduzioni IT / EN / ES / PT / JA. t('chiave', ...argomenti): i valori sono testi o funzioni (plurali, numeri, nomi).
import it from './it.js'
import en from './en.js'
import es from './es.js'
import pt from './pt.js'
import ja from './ja.js'

export const LANGS = [['it', 'Italiano'], ['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['ja', '日本語']]
const DICTS = { it, en, es, pt, ja }
const LOCALES = { it: 'it-IT', en: 'en-GB', es: 'es-ES', pt: 'pt-BR', ja: 'ja-JP' }
const KEY = 'mdm.lang'

// Fusi orari come indizio del paese: usati solo se la lingua del dispositivo non è tra quelle del sito
const TZ_ES = /^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta|America\/(Mexico_City|Cancun|Merida|Monterrey|Chihuahua|Hermosillo|Mazatlan|Tijuana|Bogota|Lima|Santiago|Punta_Arenas|Argentina\/.*|Buenos_Aires|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Panama|Costa_Rica|Guatemala|El_Salvador|Tegucigalpa|Managua|Havana|Santo_Domingo|Puerto_Rico))$/
const TZ_IT = /^Europe\/(Rome|San_Marino|Vatican)$/
const TZ_PT = /^(America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Araguaina|Maceio|Noronha|Santarem|Eirunepe)|Europe\/Lisbon|Atlantic\/(Azores|Madeira)|Africa\/(Luanda|Maputo))$/
const TZ_JA = /^Asia\/Tokyo$/

// Ordine: scelta salvata → ?lang= nell'indirizzo → lingue del dispositivo → fuso orario → inglese
export function detectLang({ saved, search = '', languages = [], timeZone = '' } = {}) {
  const ok = l => l && DICTS[l] ? l : null
  const fromUrl = new URLSearchParams(search).get('lang')
  const fromDevice = languages.map(l => ok(String(l).slice(0, 2).toLowerCase())).find(Boolean)
  const fromTz = TZ_IT.test(timeZone) ? 'it' : TZ_ES.test(timeZone) ? 'es' : TZ_PT.test(timeZone) ? 'pt' : TZ_JA.test(timeZone) ? 'ja' : null
  return ok(saved) || ok(fromUrl) || fromDevice || fromTz || 'en'
}

const env = () => {
  const g = globalThis
  let saved = null
  try { saved = g.localStorage?.getItem(KEY) } catch { /* bloccato */ }
  return {
    saved, search: g.location?.search || '',
    languages: g.navigator?.languages?.length ? g.navigator.languages : [g.navigator?.language].filter(Boolean),
    timeZone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } })(),
  }
}

let lang = detectLang(env())
export const getLang = () => lang
export const locale = () => LOCALES[lang]
export function setLang(l) {
  if (!DICTS[l]) return
  lang = l
  try { localStorage.setItem(KEY, l) } catch { /* bloccato */ }
  if (globalThis.document) document.documentElement.lang = l
}
if (globalThis.document) document.documentElement.lang = lang

export function t(key, ...args) {
  const v = DICTS[lang][key] ?? DICTS.it[key]
  if (v === undefined) return key
  return typeof v === 'function' ? v(...args) : v
}

// Numeri e date nel formato della lingua
const cache = new Map()
const fmt = (k, make) => { const id = lang + k; let f = cache.get(id); if (!f) cache.set(id, f = make(locale())); return f }
export const num = (v, digits = 1) => fmt('n' + digits, l => new Intl.NumberFormat(l, { maximumFractionDigits: digits })).format(v)
export const dayMonth = d => d ? new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : null
export const plural = (n, one, many) => n === 1 ? one : many

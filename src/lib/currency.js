// Prezzi nella valuta locale. Scryfall dà due prezzi per carta: euro (Cardmarket, mercato europeo) e dollari
// (TCGplayer, mercato americano). Si parte da quello del mercato più vicino all'utente e si converte con i cambi BCE.
import { locale } from '../i18n/index.js'

// Cambi BCE (1 EUR = x valuta). Valori di riserva: vengono sostituiti da meta/rates.json, aggiornato ogni notte.
let RATES = { EUR: 1, USD: 1.1195, GBP: 0.84385, CHF: 0.933, SEK: 11.158, NOK: 10.6035, DKK: 7.4754, PLN: 4.3658, CZK: 24.357, HUF: 363.3, RON: 5.3442, TRY: 55.2921, ISK: 136.4, JPY: 177.39, KRW: 1496.54, CNY: 7.4925, HKD: 8.7859, SGD: 1.4359, INR: 106.5283, IDR: 20062.67, PHP: 70.393, THB: 37.587, MYR: 4.5704, ILS: 3.4443, AUD: 1.5971, NZD: 1.9941, CAD: 1.5918, MXN: 20.56, BRL: 5.6246, ZAR: 18.4382 }
export const setRates = r => { if (r && r.USD) RATES = { ...r, EUR: 1 } }

// Valute che partono dal prezzo europeo (Cardmarket); tutte le altre dal prezzo americano (TCGplayer)
const EUR_BASED = new Set(['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'ISK'])

// Fuso orario → valuta (indizio della posizione, senza chiedere permessi)
const TZ = [
  [/^Europe\/(London|Belfast|Guernsey|Isle_of_Man|Jersey)$/, 'GBP'], [/^Europe\/(Zurich|Busingen)$/, 'CHF'], [/^Europe\/Stockholm$/, 'SEK'],
  [/^(Europe\/Oslo|Arctic\/Longyearbyen)$/, 'NOK'], [/^(Europe\/Copenhagen|Atlantic\/Faroe|America\/(Nuuk|Godthab))$/, 'DKK'], [/^Europe\/Warsaw$/, 'PLN'],
  [/^Europe\/Prague$/, 'CZK'], [/^Europe\/Budapest$/, 'HUF'], [/^Europe\/Bucharest$/, 'RON'], [/^(Europe|Asia)\/Istanbul$/, 'TRY'], [/^Atlantic\/Reykjavik$/, 'ISK'],
  [/^(Europe|Atlantic\/(Canary|Madeira|Azores)|Africa\/Ceuta)\//, 'EUR'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Yellowknife|Iqaluit|Rankin_Inlet|Cambridge_Bay|Swift_Current|Atikokan|Creston|Fort_Nelson|Thunder_Bay|Nipigon|Rainy_River|Inuvik)$/, 'CAD'],
  [/^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Hermosillo|Mazatlan|Bahia_Banderas|Tijuana)$/, 'MXN'],
  [/^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Araguaina|Maceio|Noronha|Santarem|Eirunepe)$/, 'BRL'],
  [/^Asia\/Tokyo$/, 'JPY'], [/^Asia\/Seoul$/, 'KRW'], [/^Asia\/(Shanghai|Chongqing|Harbin|Urumqi)$/, 'CNY'], [/^Asia\/Hong_Kong$/, 'HKD'],
  [/^Asia\/Singapore$/, 'SGD'], [/^Asia\/(Kolkata|Calcutta)$/, 'INR'], [/^Asia\/(Jakarta|Makassar|Jayapura|Pontianak)$/, 'IDR'], [/^Asia\/Manila$/, 'PHP'],
  [/^Asia\/Bangkok$/, 'THB'], [/^Asia\/(Kuala_Lumpur|Kuching)$/, 'MYR'], [/^Asia\/(Jerusalem|Tel_Aviv)$/, 'ILS'],
  [/^Australia\//, 'AUD'], [/^Pacific\/(Auckland|Chatham)$/, 'NZD'], [/^Africa\/Johannesburg$/, 'ZAR'],
]
// Paese nella lingua del dispositivo (es. en-GB) → valuta, se il fuso orario non basta
const EURO = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK BG SM VA MC AD ME XK'.split(' ')
const COUNTRY = { US: 'USD', GB: 'GBP', CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY', IS: 'ISK', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', SG: 'SGD', IN: 'INR', ID: 'IDR', PH: 'PHP', TH: 'THB', MY: 'MYR', IL: 'ILS', AU: 'AUD', NZ: 'NZD', CA: 'CAD', MX: 'MXN', BR: 'BRL', ZA: 'ZAR' }

// Ordine: ?currency= nell'indirizzo → fuso orario → paese della lingua del dispositivo → euro in Europa, dollaro altrove
export function detectCurrency({ search = '', timeZone = '', languages = [] } = {}) {
  const forced = new URLSearchParams(search).get('currency')?.toUpperCase()
  if (forced && (RATES[forced] || forced === 'EUR')) return forced
  const tz = TZ.find(([re]) => re.test(timeZone))?.[1]
  if (tz) return tz
  for (const l of languages) {
    const c = String(l).split('-')[1]?.toUpperCase()
    if (c && EURO.includes(c)) return 'EUR'
    if (c && COUNTRY[c]) return COUNTRY[c]
  }
  return /^(America|Pacific\/Honolulu)/.test(timeZone) ? 'USD' : /^(Asia|Africa|Pacific|Indian)/.test(timeZone) ? 'USD' : 'EUR'
}

// Valute selezionabili (cambi BCE + euro), nell'ordine del selettore
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'KRW', 'CNY', 'HKD', 'SGD', 'INR', 'IDR', 'PHP', 'THB', 'MYR', 'BRL', 'MXN', 'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'ILS', 'ZAR']
const KEY = 'mdm.currency'
const saved = (() => { try { return globalThis.localStorage?.getItem(KEY) } catch { return null } })()

// Scelta salvata dal selettore → rilevamento automatico
let CUR = CURRENCIES.includes(saved) ? saved : detectCurrency({
  search: globalThis.location?.search || '',
  timeZone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } })(),
  languages: globalThis.navigator?.languages || [],
})
export const currency = () => CUR
export const setCurrency = (c, persist = false) => {
  CUR = c
  if (persist) try { localStorage.setItem(KEY, c) } catch { /* bloccato */ }
}
// Simbolo breve per il selettore (es. € , $, ¥); se coincide col codice non si ripete
export const currencySymbol = (c, loc) => { try { return new Intl.NumberFormat(loc, { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency')?.value } catch { return c } }
export const priceSource = () => EUR_BASED.has(CUR) ? 'Cardmarket' : 'TCGplayer'

// Prezzo di una carta nella valuta locale; se manca quello del mercato di riferimento si converte l'altro
export function priceOf(card, cur = CUR) {
  if (!card) return null
  const fromEur = v => v == null ? null : v * (RATES[cur] ?? 1)
  const fromUsd = v => v == null ? null : v / RATES.USD * (RATES[cur] ?? 1)
  return EUR_BASED.has(cur) ? fromEur(card.eur) ?? fromUsd(card.usd) : fromUsd(card.usd) ?? fromEur(card.eur)
}

// Importo formattato (centesimi solo se richiesti; lo yen non ne ha comunque)
const fmts = new Map()
export function money(v, cents = false) {
  const k = `${locale()}|${CUR}|${cents}`
  let f = fmts.get(k)
  if (!f) fmts.set(k, f = new Intl.NumberFormat(locale(), { style: 'currency', currency: CUR, ...(cents ? {} : { maximumFractionDigits: 0, minimumFractionDigits: 0 }) }))
  return f.format(v)
}

// Soglia di budget in valuta locale, arrotondata a una cifra "da negozio" (es. 25 € → 30 $, 4.000 ¥)
export function localBudget(eurValue, cur = CUR) {
  const x = eurValue * (RATES[cur] ?? 1)
  const mag = 10 ** Math.floor(Math.log10(x))
  return [1, 2, 2.5, 3, 4, 5, 10].map(m => m * mag).reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a)
}

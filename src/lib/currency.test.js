import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectCurrency, priceOf, localBudget, setRates } from './currency.js'

test('valuta dalla posizione presunta', () => {
  assert.equal(detectCurrency({ timeZone: 'Europe/Rome' }), 'EUR')
  assert.equal(detectCurrency({ timeZone: 'Europe/London' }), 'GBP')
  assert.equal(detectCurrency({ timeZone: 'America/New_York' }), 'USD')
  assert.equal(detectCurrency({ timeZone: 'America/Toronto' }), 'CAD')
  assert.equal(detectCurrency({ timeZone: 'America/Sao_Paulo' }), 'BRL')
  assert.equal(detectCurrency({ timeZone: 'Asia/Tokyo' }), 'JPY')
  assert.equal(detectCurrency({ timeZone: 'America/Argentina/Buenos_Aires' }), 'USD') // peso argentino non nei cambi BCE
  assert.equal(detectCurrency({ timeZone: 'UTC', languages: ['en-GB'] }), 'GBP') // fuso inutile: paese della lingua
  assert.equal(detectCurrency({ timeZone: 'UTC', languages: ['it-IT'] }), 'EUR')
  assert.equal(detectCurrency({ search: '?currency=jpy', timeZone: 'Europe/Rome' }), 'JPY')
})

test('prezzo dal mercato più vicino, convertito', () => {
  setRates({ USD: 1.1, GBP: 0.85, JPY: 170 })
  const card = { eur: 10, usd: 12 }
  assert.equal(priceOf(card, 'EUR'), 10)                    // Cardmarket
  assert.equal(priceOf(card, 'USD'), 12)                    // TCGplayer
  assert.ok(Math.abs(priceOf(card, 'GBP') - 8.5) < 1e-9)    // Cardmarket convertito
  assert.ok(Math.abs(priceOf(card, 'JPY') - 12 / 1.1 * 170) < 1e-6) // TCGplayer convertito
  assert.ok(Math.abs(priceOf({ eur: 10, usd: null }, 'USD') - 11) < 1e-9) // manca il dollaro: si converte l'euro
  assert.equal(priceOf(null, 'EUR'), null)
})

test('soglie di budget arrotondate nella valuta locale', () => {
  setRates({ USD: 1.12, JPY: 177 })
  assert.equal(localBudget(25, 'EUR'), 25)
  assert.equal(localBudget(25, 'USD'), 30)
  assert.equal(localBudget(10, 'JPY'), 2000)
  assert.equal(localBudget(100, 'JPY'), 20000)
})

test('negozio in base alla valuta', async () => {
  const { storeFor } = await import('./export.js')
  const miss = [{ name: 'Lightning Bolt', missing: 4 }]
  assert.equal(storeFor('EUR', 'it', miss).name, 'Cardmarket')
  assert.equal(storeFor('EUR', 'it', miss).url, 'https://www.cardmarket.com/it/Magic/Wants')
  assert.equal(storeFor('GBP', 'en', miss).url, 'https://www.cardmarket.com/en/Magic/Wants')
  assert.equal(storeFor('USD', 'en', miss).name, 'TCGplayer')
  assert.ok(storeFor('USD', 'en', miss).url.includes('4%20Lightning%20Bolt'))
  assert.equal(storeFor('BRL', 'pt', miss).name, 'LigaMagic')
  assert.equal(storeFor('JPY', 'ja', miss).url, 'https://www.hareruyamtg.com/ja/')
  assert.equal(storeFor('MXN', 'es', miss).name, 'TCGplayer')
})

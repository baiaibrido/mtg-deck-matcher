# System map

```mermaid
graph TD
  App[App.jsx] --> DL[DeckList]
  App --> CM[CollectionManager]
  App --> DD[DeckDetail]
  App --> MI[MetaImporter]
  App --> UL[state/useLocal]
  App --> UR[state/useRoute]
  App --> DI[lib/deckInfo]
  DL --> MA[Mana]
  DD --> MA
  DD --> DI
  MA --> DI
  App --> MD[lib/metaDecks]
  App --> MT[lib/matcher]
  CM --> PA[lib/parser]
  CM --> SF[lib/scryfall]
  App --> SF
  MI --> PA
  DD --> SF
  DD --> EX[lib/export]
  MD --> PA
  MT --> NO[lib/normalize]
  PA --> NO
  SF --> NO
  MD -. fetch .-> META[(public/meta/*.json)]
  SF -. HTTPS .-> SCRY[(api.scryfall.com)]
  UL -. persist .-> LS[(localStorage)]
```

Layer:
- **UI** `components/*` — solo presentazione + eventi.
- **State** `App.jsx` + `useLocal` — fonte unica di verità.
- **Engine** `matcher.js` — funzioni pure, testate.
- **Data/API** `parser.js`, `metaDecks.js`, `scryfall.js`, `export.js`.

Sync notturno: `.github/workflows/sync-meta.yml` → `scripts/sync-mtgtop8.mjs` → MTGTop8 → `public/meta/*.json` → commit → deploy Vercel.

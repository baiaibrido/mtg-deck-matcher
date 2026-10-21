# Netdeckable — piano di design v2 «La classifica stampata, in ordine»

## Soggetto e lavoro principale
Giocatori di Magic su carta (comunità del negozio) che vogliono sapere quali mazzi del meta possono finire con la loro collezione.
Lavoro principale di ogni pagina: la lista (mazzi, carte, statistiche). Tutto il resto è contorno.

## Colore (invariato, approvato)
Scuro: carta #181b1d · foglio #1f2427 · riga verde #1e2826 · inchiostro #e5e8e0 · sbiadito #a1aaa2 · linea #3a4442 · nastro #a9b6ff
Chiaro: carta #e8ebe3 · foglio #f1f3ed · riga verde #d7e3d0 · inchiostro #23272c · sbiadito #545c55 · linea #b4bdb0 · nastro #2c3a92
Significati: verde/giallo evidenziatore = hai/ti manca; timbri rosso/arancio/verde = bannata/ristretta/completo.

## Tipografia
Alegreya Sans (UI, 400/600/700/800), «Netdeck Display» = Alegreya Sans 800 per i titoli, Doto (numeri a punti: rank, %, statistiche grandi — l'unico elemento «forte»), Caveat solo per le note a penna.
Scala: 12 · 13 · 14 · 15 (controlli) · 17 (testo) · 20 (titolo voce) · 24 (titolo sezione) · 32 (titolo pagina) · 44 (numeri grandi). Niente MAIUSCOLETTO nelle etichette (solo timbri e scontrino, che lo sono davvero).

## Spazi (base 4)
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Sotto-navigazione → titolo 24; titolo → strumenti 16; strumenti → lista 16; sezioni 48 (32 su telefono).

## Controlli: un solo vocabolario
- Altezza unica: 40px (mouse) / 44px (dita). Raggio 3px. Bordo 1px linea; hover inchiostro.
- Selezionato = fondo inchiostro, testo carta. Ovunque. Nessuna ombra.
- Principale (uno per vista) = inchiostro + ombra sfalsata color nastro. È l'unico elemento con ombra.
- Segmentato (.seg): scelta singola tra 2–5 opzioni (ordina, tier, vista, tipo carta).
- Linguette (.tabs): navigazione tra viste dello stesso oggetto (formati, Mazzo/Mancolista/Meta).
- Menu (Picker), campi, interruttore, contatore: stessa altezza e bordo.

## Impaginazione
Contenitore 1040 (contenuto 1008), margini 16. Sequenza fissa: testata · linguette · titolo pagina · strumenti · contenuto.
Prima schermata su portatile 1280×600: si vede almeno il primo elemento della lista.

## Principi
1. Contenuto prima: la cornice sopra la lista ≤ 45% dell'altezza della finestra.
2. Un vocabolario di controlli, un solo «selezionato», un solo principale per vista.
3. I numeri a punti sono la cosa memorabile; il resto è quieto.
4. I dettagli di carta (fori, timbri, evidenziatore, scontrino) dicono qualcosa, non decorano.
5. Niente salti di impaginazione quando si interagisce (titolo su una riga, controlli a misura fissa).
6. Ogni finestra e menu sta dentro lo schermo, a qualsiasi altezza (prova a 1280×600 e 360×740).

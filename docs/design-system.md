# Netdeckable — piano di design v3 «Terminale dati» (v0.38.0)

## Soggetto e lavoro principale
Giocatori di Magic su carta (comunità del negozio) che vogliono sapere quali mazzi del meta possono finire con la loro collezione.
Lavoro principale di ogni pagina: la lista (mazzi, carte, statistiche). Tutto il resto è contorno.
Stile scelto con la skill taste (`draw.mjs --app --kind markets --style data-terminal`): uno schermo da consultare a lungo.
Il volto: i numeri grandi a punti (Doto) e il logo. Via la carta stampata (fori, timbri, evidenziatore, penna, grana, scontrino).

## Colore
Scuro: fondo #171719 · foglio #131217 (più scuro del fondo) · rialzo #212023 · testo #ffffff · secondario #8a8c92 · linea #26262a · bordo comandi #64656b · accento #4a8ad6
Chiaro: fondo #f2f2f3 · foglio #fbfbfc · rialzo #e9e9ec · testo #141416 · secondario #5d5f66 · linea #dddde1 · bordo comandi #8b8c93 · accento #2463b5
Accento sotto il 3%: link, fuoco, la linea di selezione da 1px e la serie principale dei grafici. I numeri restano bianchi o grigi e portano il segno nel testo (+2,7 / −3,5);
verde e rosso solo nella colonna «cosa si è mosso» e nelle targhette (fondo scuro tinto + testo del colore: ok, manca, bannata, ristretta).
I colori di Magic sono dati: tacca da 2px a due metà nette sul bordo sinistro delle righe e in cima alla scheda del mazzo.

## Tipografia
Public Sans (400/500/600/700) per tutto il testo; Doto per i numeri grandi (rank, %, cifre principali) e il logo. Cifre tabellari ovunque.
Scala: 12 · 13 · 14 (comandi, testo secondario) · 15 (testo) · 16/600 (titolo di un foglio) · 20 (titolo di sezione) · 26/700 (titolo di pagina) · 44 (numeri a punti). Niente maiuscoletto.

## Spazi (base 4)
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Sotto-navigazione → titolo 24; titolo → strumenti 16; strumenti → lista 16; sezioni 48 (32 su telefono).

## Controlli: un solo vocabolario
- Altezza unica: 36px (mouse) / 44px (dita). Pulsanti e menu a pillola su fondo rialzato, bordo 1px linea; campi con raggio 6px e bordo ≥ 3:1.
- Selezionato = testo pieno + linea d'accento da 1px larga quanto l'etichetta, sul bordo più vicino (linguette, segmenti, voci della testata, barra in basso). Ovunque.
- Principale (uno per vista) = pillola bianca (nera nel tema chiaro). Le ombre morbide sono solo dei fogli, dei menu e delle finestre.
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
4. Fogli più scuri del fondo, righe su linee da 1px, niente zebra, niente gradienti, niente vetro.
5. Niente salti di impaginazione quando si interagisce (titolo su una riga, controlli a misura fissa).
6. Ogni finestra e menu sta dentro lo schermo, a qualsiasi altezza (prova a 1280×600 e 360×740).

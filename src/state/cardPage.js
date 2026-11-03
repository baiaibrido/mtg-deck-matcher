// Apre la scheda della carta da qualunque pagina (mazzo, carte chiave): la scheda sta una volta sola in App.
let listener = null
export const openCard = req => listener?.(req)
export const onOpenCard = fn => { listener = fn; return () => { if (listener === fn) listener = null } }

// Link a Scryfall che, con un clic normale, apre invece la scheda nel sito (Ctrl/Cmd o rotella: Scryfall in un'altra scheda)
export const cardLink = (req, open = openCard) => ({
  onClick: e => { if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); open(req) },
})

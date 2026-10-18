// Tag di Scryfall (public/meta/tags.json, ~300 KB compressi): scaricati una volta sola e solo quando servono
import { tagIndex } from './collection.js'
const base = import.meta.env?.BASE_URL || '/'
let tagsP
export const loadTags = () => tagsP ??= fetch(`${base}meta/tags.json`).then(r => r.ok ? r.json() : null).then(tagIndex).catch(() => { tagsP = null; return tagIndex(null) })

import { IconSunny, IconPartly, IconCloudy, IconRain, IconStorm } from './Icons.jsx'

// Il tempo di un mazzo come icona disegnata (non emoji): colore dello stato, testo per chi ascolta a parte
const ICON = { sun: IconSunny, partly: IconPartly, cloud: IconCloudy, rain: IconRain, storm: IconStorm }
export default function SkyIcon({ sky, size = 20 }) {
  const C = ICON[sky] || IconCloudy
  return <C size={size} className={`sky sky-${sky}`} />
}

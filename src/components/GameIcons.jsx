import { IconBase as I, IconBox, IconCoins, IconTarget, IconStar, IconChili, IconGlobe, IconFlame, IconSearch, IconQuestion, IconMoon } from './Icons.jsx'

// Icone disegnate per traguardi e quiz (stesso tratto lineare del resto del sito, niente emoji)
const IconSprout = p => <I {...p} d={<><path d="M12 21v-9" /><path d="M12 12c0-3.5-2.4-6-6.5-6 0 3.6 2.6 6 6.5 6z" /><path d="M12 14.5c0-3.2 2.2-5.5 6-5.5 0 3.3-2.3 5.5-6 5.5z" /></>} />
const IconBinder = p => <I {...p} d={<><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 3v18" /><path d="M5 7.5h2M5 12h2M5 16.5h2" /><path d="M12 8h4M12 11h4" /></>} />
const IconLibrary = p => <I {...p} d={<><path d="M3 9.5 12 4l9 5.5z" /><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8" /><path d="M3 20.5h18" /></>} />
const IconPalette = p => <I {...p} d={<><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.1-1.6-1.1-2.7 0-1 .8-1.6 1.8-1.6h2.1A3.9 3.9 0 0 0 20.5 11c0-4.2-3.8-7.5-8.5-7.5z" /><circle cx="7.8" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="14.8" cy="7.8" r="1" /></>} />
const IconRainbow = p => <I {...p} d={<><path d="M2.5 18a9.5 9.5 0 0 1 19 0" /><path d="M6 18a6 6 0 0 1 12 0" /><path d="M9.3 18a2.7 2.7 0 0 1 5.4 0" /></>} />
const IconTrophy = p => <I {...p} d={<><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4" /><path d="M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" /></>} />
const IconCrown = p => <I {...p} d={<><path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10z" /><path d="M4.5 20.5h15" /></>} />
const IconEye = p => <I {...p} d={<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>} />
const IconCompass = p => <I {...p} d={<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>} />
const IconHat = p => <I {...p} d={<><path d="M2.5 16.5c3 1.6 16 1.6 19 0" /><path d="M5.5 16.2 7 8.5c.3-1.6 2.2-2.2 3.3-1.2l1.7 1.5 1.7-1.5c1.1-1 3-.4 3.3 1.2l1.5 7.7" /><path d="M6.4 12.5c3.5 1 7.7 1 11.2 0" /></>} />
const IconSharp = p => <I {...p} d={<><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.6" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M19.8 4.2l-1.4 1.4M5.6 18.4l-1.4 1.4" /></>} />
const IconLock = p => <I {...p} d={<><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>} />
export const IconMedal = p => <I {...p} d={<><path d="M8 3h3l1.5 5M16 3h-3l-1 3.5" /><circle cx="12" cy="15" r="6" /><path d="m12 12 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" /></>} />
const IconBolt = p => <I {...p} d={<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />} />
const IconScales = p => <I {...p} d={<><path d="M12 3.5v17M8 20.5h8M5 6.5h14" /><path d="M5 6.5 2.5 13a3 3 0 0 0 5 0zM19 6.5 16.5 13a3 3 0 0 0 5 0z" /></>} />
const IconHourglass = p => <I {...p} d={<><path d="M6 3h12M6 21h12" /><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></>} />
const IconClaw = p => <I {...p} d={<><path d="M6 20c-1-3 0-6.5 2.5-9M11 20c-.6-3.6.3-7.2 2.6-10M16 20c-.2-3.4.9-6.6 3.2-8.8" /><path d="M8.5 11 7 8.3M13.6 10l-.9-3M19.2 11.2l.3-3.1" /></>} />
const IconSparkle = p => <I {...p} d={<><path d="M11 3c.6 4.4 2.4 6.2 6.8 6.8-4.4.6-6.2 2.4-6.8 6.8-.6-4.4-2.4-6.2-6.8-6.8C8.6 9.2 10.4 7.4 11 3z" /><path d="M18 15.5c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9z" /></>} />
const IconDice = p => <I {...p} d={<><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8.8" cy="8.8" r=".9" fill="currentColor" /><circle cx="15.2" cy="8.8" r=".9" fill="currentColor" /><circle cx="12" cy="12" r=".9" fill="currentColor" /><circle cx="8.8" cy="15.2" r=".9" fill="currentColor" /><circle cx="15.2" cy="15.2" r=".9" fill="currentColor" /></>} />
const IconCoin = p => <I {...p} d={<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /></>} />
const IconGem = p => <I {...p} d={<><path d="M7 4h10l4 5.5L12 20.5 3 9.5z" /><path d="M3 9.5h18M9.5 4 8 9.5l4 11 4-11L14.5 4" /></>} />
const IconCrowd = p => <I {...p} d={<><circle cx="9" cy="8" r="3" /><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" /><circle cx="16.5" cy="9" r="2.4" /><path d="M15.4 14.6c2.6-.3 4.6 1.3 5.1 4.4" /></>} />
const IconShuffle = p => <I {...p} d={<><path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.7 0 3-1.4 4.1-3.1M13.4 10.1C14.5 8.4 15.8 7 17.5 7H21" /><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" /></>} />

const ACH = {
  first: IconSprout, c100: IconBox, c500: IconBinder, c1000: IconLibrary, value: IconCoins, color: IconPalette, rainbow: IconRainbow,
  almost: IconTarget, complete: IconTrophy, three: IconCrown, fan: IconStar, curious: IconEye, rogue: IconChili, globe: IconGlobe,
  explorer: IconCompass, streak: IconFlame, detective: IconSearch, sleuth: IconHat, sharp: IconSharp, quiz: IconQuestion, night: IconMoon,
}
// bloccato: la stessa icona, sbiadita (si vede cosa si può ottenere); il lucchetto piccolo dice che manca ancora
export const AchIcon = ({ id, on, size = 22 }) => { const C = ACH[id] || IconStar; return <>{<C size={size} />}{!on && <IconLock size={13} className="ach-lock" />}</> }

const QUIZ = {
  speed: { fast: IconBolt, mid: IconScales, slow: IconHourglass },
  style: { crea: IconClaw, spells: IconSparkle, mix: IconDice },
  budget: { 50: IconCoin, 150: IconCoins, 0: IconGem },
  pop: { meta: IconCrowd, off: IconChili, any: IconShuffle },
  color: { any: IconRainbow },
}
export const QuizIcon = ({ q, v, size = 22 }) => { const C = QUIZ[q]?.[v] || IconQuestion; return <C size={size} /> }

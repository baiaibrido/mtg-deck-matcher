import { t } from '../../i18n/index.js'
import GuessGame from './GuessGame.jsx'
import Lucky from './Lucky.jsx'
import Pack from './Pack.jsx'
import Quiz from './Quiz.jsx'
import Achievements from './Achievements.jsx'

// Sezione Gioca: giochi con i mazzi del formato scelto e bacheca dei traguardi
export default function PlayPage({ meta, format, formatName, colorsOf, getCard, isLand, onOpen, toast, bumpFun, unlocked }) {
  const decks = meta || []
  const pool = decks.filter(d => d.source !== 'utente')
  return (
    <div className="play">
      <header className="page-head">
        <h1>{t('play.title', formatName)}</h1>
        <p>{t('play.intro')}</p>
      </header>
      {!meta ? <div className="decks skeleton" aria-busy="true" /> : <>
        <GuessGame decks={decks} format={format} formatName={formatName} isLand={isLand} onOpen={onOpen} toast={toast}
          onWin={n => bumpFun(f => ({ guessWins: (f.guessWins || 0) + 1, guessFirst: f.guessFirst || n === 1 }))} />
        <div className="play-grid">
          <Pack decks={decks} isLand={isLand} onOpen={onOpen} onPack={() => bumpFun(f => ({ packs: (f.packs || 0) + 1 }))} />
          <Lucky pool={pool} colorsOf={colorsOf} onOpen={onOpen} onSpin={() => bumpFun(f => ({ lucky: (f.lucky || 0) + 1 }))} />
          <Quiz decks={decks} getCard={getCard} colorsOf={colorsOf} onOpen={onOpen} onDone={() => bumpFun({ quiz: true })} />
          <Achievements unlocked={unlocked} />
        </div>
      </>}
    </div>
  )
}

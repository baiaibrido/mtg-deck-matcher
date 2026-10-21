import { useState } from 'react'
import { t, num } from '../../i18n/index.js'
import { quizMatch } from '../../lib/fun.js'
import { signatureOf } from '../../lib/daily.js'
import { money } from '../../lib/currency.js'
import { ColorPips } from '../Mana.jsx'
import CardFace from './CardFace.jsx'

// Che mazzo sei?: 5 domande una alla volta, poi il mazzo del meta più vicino alle risposte
const QS = [
  ['speed', ['fast', 'mid', 'slow'], { fast: '⚡', mid: '⚖️', slow: '🐢' }],
  ['style', ['crea', 'spells', 'mix'], { crea: '🐺', spells: '✨', mix: '🎲' }],
  ['color', ['W', 'U', 'B', 'R', 'G', 'any'], {}],
  ['budget', [50, 150, 0], { 50: '🪙', 150: '💰', 0: '💎' }],
  ['pop', ['meta', 'off', 'any'], { meta: '🏟️', off: '🌶️', any: '🤷' }],
]
export default function Quiz({ decks, getCard, colorsOf, isLand, onGo, onDone }) {
  const [step, setStep] = useState(0)
  const [ans, setAns] = useState({})
  const [res, setRes] = useState(null)
  const answer = (k, v) => {
    const a = { ...ans, [k]: v }; setAns(a)
    if (step < QS.length - 1) return setStep(step + 1)
    setRes(quizMatch(decks, a, getCard, colorsOf) || 'none'); setStep(QS.length); onDone()
  }
  const restart = () => { setAns({}); setRes(null); setStep(0) }
  const label = (k, v) => k === 'color' ? (v === 'any' ? t('quiz.color.any') : t(`color.${v}`)) : k === 'budget' ? (v ? t('budget.max', money(v)) : t('quiz.budget.any')) : t(`quiz.${k}.${v}`)

  if (step === QS.length) {
    if (res === 'none') return <div className="game"><p className="empty">{t('quiz.none')}</p><button className="btn" onClick={restart}>{t('quiz.again')}</button></div>
    const sig = signatureOf(res.d, decks, isLand)
    return (
      <div className="game quiz-res">
        <p className="game-kicker">{t('quiz.you')}</p>
        <div className="quiz-reveal">
          {sig && <CardFace name={sig} className="quiz-card" />}
          <div>
            <h2 className="quiz-deck">{res.d.name}</h2>
            <ColorPips colors={colorsOf(res.d)} size="1.1rem" />
            <p className="game-text">{t('quiz.why', t(`quiz.speed.${res.p.cmc < 2.2 ? 'fast' : res.p.cmc < 2.9 ? 'mid' : 'slow'}`).toLowerCase(), num(Math.round(res.p.crea * 100)), money(res.p.price))}</p>
          </div>
        </div>
        <div className="game-actions">
          <button className="btn btn-primary" onClick={() => onGo(res.d.id)}>{t('quiz.open')}</button>
          <button className="btn btn-quiet" onClick={restart}>{t('quiz.again')}</button>
        </div>
      </div>
    )
  }
  const [k, opts, icons] = QS[step]
  return (
    <div className="game">
      <p className="game-kicker">{t('quiz.title')}</p>
      <div className="quiz-progress"><span className="quiz-bar" aria-hidden="true"><span style={{ width: `${(step + 1) / QS.length * 100}%` }} /></span><span className="game-step">{step + 1} / {QS.length}</span></div>
      <div className="quiz-q" key={k}>
        <h2 className="quiz-ask">{t(`quiz.${k}`)}</h2>
        <div className={`quiz-opts${k === 'color' ? ' quiz-colors' : ''}`}>
          {opts.map((v, i) => (
            <button key={v} className="quiz-opt" style={{ '--i': i }} onClick={() => answer(k, v)}>
              {k === 'color' && v !== 'any' ? <i className={`ms ms-${v.toLowerCase()} ms-cost`} aria-hidden="true" /> : <span aria-hidden="true">{icons[v] || '🌈'}</span>}
              {label(k, v)}
            </button>
          ))}
        </div>
      </div>
      {step > 0 && <p className="game-step"><button className="linklike" onClick={() => setStep(step - 1)}>{t('quiz.back')}</button></p>}
    </div>
  )
}

import { useState } from 'react'
import { t, num } from '../../i18n/index.js'
import { quizMatch } from '../../lib/fun.js'
import { money } from '../../lib/currency.js'
import { ColorPips } from '../Mana.jsx'

// Che mazzo sei?: 5 domande, poi il mazzo del meta più vicino alle risposte
const QS = [
  ['speed', ['fast', 'mid', 'slow']],
  ['style', ['crea', 'spells', 'mix']],
  ['color', ['W', 'U', 'B', 'R', 'G', 'any']],
  ['budget', [50, 150, 0]],
  ['pop', ['meta', 'off', 'any']],
]
export default function Quiz({ decks, getCard, colorsOf, onOpen, onDone }) {
  const [step, setStep] = useState(-1)
  const [ans, setAns] = useState({})
  const [res, setRes] = useState(null)
  const answer = (k, v) => {
    const a = { ...ans, [k]: v }; setAns(a)
    if (step < QS.length - 1) return setStep(step + 1)
    setRes(quizMatch(decks, a, getCard, colorsOf)); setStep(QS.length); onDone()
  }
  const restart = () => { setAns({}); setRes(null); setStep(0) }
  return (
    <section className="panel play-quiz" aria-labelledby="quiz-title">
      <div className="play-head">
        <h2 id="quiz-title">{t('quiz.title')}</h2>
        {step >= 0 && step < QS.length && <span className="play-sub">{step + 1}/{QS.length}</span>}
      </div>
      {step < 0 && <>
        <p className="play-intro">{t('quiz.intro')}</p>
        <div className="row"><button className="btn btn-primary" onClick={() => setStep(0)}>🪞 {t('quiz.start')}</button></div>
      </>}
      {step >= 0 && step < QS.length && (() => {
        const [k, opts] = QS[step]
        return <div className="quiz-q" key={k}>
          <p className="quiz-ask">{t(`quiz.${k}`)}</p>
          <div className="chips">
            {opts.map(v => <button key={v} onClick={() => answer(k, v)}>
              {k === 'color' && v !== 'any' ? <><i className={`ms ms-${v.toLowerCase()} ms-cost`} aria-hidden="true" /> {t(`color.${v}`)}</>
                : k === 'budget' ? (v ? t('budget.max', money(v)) : t('quiz.budget.any')) : t(`quiz.${k}.${v}`)}
            </button>)}
          </div>
          <div className="quiz-dots" aria-hidden="true">{QS.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
        </div>
      })()}
      {step === QS.length && (res ? (
        <div className="quiz-res">
          <p className="quiz-you">{t('quiz.you')}</p>
          <p className="quiz-deck">{res.d.name} <ColorPips colors={colorsOf(res.d)} /></p>
          <p className="play-intro">{t('quiz.why', t(`quiz.speed.${res.p.cmc < 2.2 ? 'fast' : res.p.cmc < 2.9 ? 'mid' : 'slow'}`).toLowerCase(), num(Math.round(res.p.crea * 100)), money(res.p.price))}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => onOpen(res.d.id)}>{t('quiz.open')} →</button>
            <button className="btn btn-quiet" onClick={restart}>{t('quiz.again')}</button>
          </div>
        </div>
      ) : <><p className="empty">{t('quiz.none')}</p><button className="btn" onClick={restart}>{t('quiz.again')}</button></>)}
    </section>
  )
}

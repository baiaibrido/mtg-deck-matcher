import { t } from '../../i18n/index.js'
import { ACHIEVEMENTS } from '../../lib/fun.js'

// Bacheca dei traguardi (salvati solo su questo dispositivo)
export default function Achievements({ unlocked }) {
  const got = ACHIEVEMENTS.filter(a => unlocked[a.id]).length
  return (
    <section className="panel play-ach" aria-labelledby="ach-title">
      <div className="play-head"><h2 id="ach-title">{t('ach.title')}</h2><span className="play-sub">{t('ach.count', got, ACHIEVEMENTS.length)}</span></div>
      <ul className="ach-list">
        {ACHIEVEMENTS.map(a => {
          const on = !!unlocked[a.id]
          return (
            <li key={a.id} className={on ? 'on' : ''}>
              <span className="ach-icon" aria-hidden="true">{on ? a.icon : '🔒'}</span>
              <span className="ach-text"><b>{t(`ach.${a.id}`)}</b><small>{t(`ach.${a.id}.d`)}</small></span>
              <span className="sr-only">{on ? t('ach.on') : t('ach.off')}</span>
            </li>
          )
        })}
      </ul>
      <p className="hint">{t('ach.hint')}</p>
    </section>
  )
}

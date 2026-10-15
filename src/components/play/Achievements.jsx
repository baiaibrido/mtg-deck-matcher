import { t } from '../../i18n/index.js'
import { ACHIEVEMENTS } from '../../lib/fun.js'

// Bacheca dei traguardi (salvati solo su questo dispositivo)
export default function Achievements({ unlocked }) {
  const got = ACHIEVEMENTS.filter(a => unlocked[a.id]).length
  return (
    <details className="ach">
      <summary><span className="ach-sum-title">🏅 {t('ach.title')}</span><span className="ach-sum-count">{t('ach.count', got, ACHIEVEMENTS.length)}</span>
        <span className="ach-bar" aria-hidden="true"><span style={{ width: `${got / ACHIEVEMENTS.length * 100}%` }} /></span></summary>
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
    </details>
  )
}

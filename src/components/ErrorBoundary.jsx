import { Component } from 'react'
import { t } from '../i18n/index.js'

// Evita la schermata bianca: mostra l'errore e un modo per ripartire
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel crash" role="alert">
        <h2>{t('err.title')}</h2>
        <p>{t('err.text')}</p>
        <pre>{String(this.state.error?.message || this.state.error)}</pre>
        <div className="row">
          <button className="btn btn-primary" onClick={() => location.reload()}>{t('err.reload')}</button>
          <a className="btn" href="/" onClick={() => this.setState({ error: null })}>{t('err.back')}</a>
        </div>
      </div>
    )
  }
}

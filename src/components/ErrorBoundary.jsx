import { Component } from 'react'

// Evita la schermata bianca: mostra l'errore e un modo per ripartire
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel crash" role="alert">
        <h2>Qualcosa non ha funzionato</h2>
        <p>La tua collezione è al sicuro, è salvata in questo browser. Ricarica la pagina; se l'errore si ripete, torna alla lista dei mazzi.</p>
        <pre>{String(this.state.error?.message || this.state.error)}</pre>
        <div className="row">
          <button className="btn btn-primary" onClick={() => location.reload()}>Ricarica</button>
          <a className="btn" href="#/mazzi" onClick={() => this.setState({ error: null })}>Torna ai mazzi</a>
        </div>
      </div>
    )
  }
}

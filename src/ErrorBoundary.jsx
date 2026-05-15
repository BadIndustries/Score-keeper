import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: '#f5ead8', background: '#12100e',
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontWeight: 600 }}>Une erreur inattendue s&apos;est produite</div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 8, padding: '10px 24px', background: '#c9933a',
              color: '#12100e', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontWeight: 600 }}>
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

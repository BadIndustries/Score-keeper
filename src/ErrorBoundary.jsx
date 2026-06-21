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
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '2rem',
          background: '#0a0a0f', color: '#f5f5f5', textAlign: 'center', gap: '1rem',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Une erreur inattendue est survenue</h2>
          <p style={{ fontSize: '.85rem', color: '#888', maxWidth: '320px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '0.5rem', padding: '10px 24px', borderRadius: 10,
              background: '#c9933a', color: '#12100e', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '.85rem',
            }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

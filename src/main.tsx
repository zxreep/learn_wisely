import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Wisely crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Something interrupted your study session</h1>
          <p style={{ color: '#666', marginTop: 8 }}>{this.state.message}</p>
          <button
            onClick={() => location.reload()}
            style={{ marginTop: 20, padding: '10px 18px', borderRadius: 10, background: '#2f6b4f', color: '#fff', border: 0, cursor: 'pointer' }}
          >
            Reload Wisely
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

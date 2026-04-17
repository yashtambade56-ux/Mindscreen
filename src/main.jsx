import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#020617', color: '#f43f5e', padding: '2rem', 
          fontFamily: 'monospace', height: '100vh', display: 'flex', 
          flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <h1 style={{ borderBottom: '1px solid #f43f5e', paddingBottom: '1rem' }}>CORE_ERROR: TERMINAL_FAILURE</h1>
          <p style={{ marginTop: '1rem' }}>{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: '2rem', background: 'transparent', color: '#06b6d4', 
            border: '1px solid #06b6d4', padding: '0.5rem 1rem', cursor: 'pointer'
          }}>REBOOT_SYSTEM</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

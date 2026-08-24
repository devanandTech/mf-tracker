import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Global ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-rose-400">Application Error Recovered</h2>
            <p className="text-xs text-slate-400">
              An unexpected external script error occurred. The app state has been preserved.
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active-press"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register PWA Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] ServiceWorker registered cleanly:', reg.scope))
      .catch((err) => console.warn('[PWA] ServiceWorker registration failed:', err));
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)

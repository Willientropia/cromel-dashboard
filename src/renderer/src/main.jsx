import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// In Docker/browser mode, inject mock API before React boots
async function bootstrap() {
  if (import.meta.env.VITE_MOCK_API === 'true' || typeof window.api === 'undefined') {
    const { setupMockApi } = await import('./lib/mockApi.js')
    await setupMockApi()
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()

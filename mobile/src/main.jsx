import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@shared/styles/global.css'
import { notifyReady } from './updater'

// Informa ao updater que o app inicializou com sucesso (evita rollback automático)
notifyReady()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

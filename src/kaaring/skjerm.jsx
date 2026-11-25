import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { RequireConfig } from './ui.jsx'
import App from './SkjermApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RequireConfig>
      <App />
    </RequireConfig>
  </StrictMode>,
)

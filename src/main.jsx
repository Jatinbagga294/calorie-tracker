import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import App from './App.jsx'
import { applyTheme, watchSystemTheme } from './lib/theme.js'
import { migrateStorage } from './lib/storage.js'

migrateStorage()
applyTheme()
watchSystemTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

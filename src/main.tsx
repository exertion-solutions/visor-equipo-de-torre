import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/app/App'
import { hydrateStoresFromUrl } from '@/app/urlSync'

hydrateStoresFromUrl()

// Modo sin conexión (public/sw.js): solo en el sitio publicado; en desarrollo cachearía el servidor de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

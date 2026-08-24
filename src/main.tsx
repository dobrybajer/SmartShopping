import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/theme'
import { registerSW } from 'virtual:pwa-register'

// Register PWA Service Worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New version of Smart Shopping is available.')
  },
  onOfflineReady() {
    console.log('[PWA] Smart Shopping is ready to work offline.')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

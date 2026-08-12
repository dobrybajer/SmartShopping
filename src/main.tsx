import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/AuthContext'
import { registerSW } from 'virtual:pwa-register'

// Wywołanie rejestracji Service Workera PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nowa wersja aplikacji Smart Shopping jest dostępna.')
  },
  onOfflineReady() {
    console.log('[PWA] Aplikacja Smart Shopping jest gotowa do pracy offline.')
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

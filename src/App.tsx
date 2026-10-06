import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import { usePantryRealtime } from '@/hooks/usePantryRealtime'
import { useTranslation } from '@/i18n'
import { LoginScreen } from '@/components/LoginScreen'
import { AppLayoutRouter } from '@/components/layout/AppLayoutRouter'
import { Toaster } from '@/components/ui/Toast'

export default function App() {
  const { user, loading, household } = useAuth()
  const { setActiveHousehold } = useShoppingStore()
  const { setActiveHousehold: setPantryHousehold } = usePantryStore()
  const { t, language } = useTranslation()

  usePantryRealtime(household?.id ?? null, () => {
    usePantryStore.getState().syncFromRealtime()
  })

  useEffect(() => {
    const hhId = household?.id ?? null
    setActiveHousehold(hhId)
    setPantryHousehold(hhId)
  }, [household?.id, setActiveHousehold, setPantryHousehold])

  useEffect(() => {
    document.title = t('meta.title')
    document.documentElement.lang = language
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', t('meta.description'))
    }
  }, [language, t])

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs tracking-wide">{t('common.loading')} Smart Shopping...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <>
      <AppLayoutRouter />
      <Toaster />
    </>
  )
}

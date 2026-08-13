import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { LoginScreen } from '@/components/LoginScreen'
import { MobileLayout } from '@/components/layout/MobileLayout'
import type { TabType } from '@/components/layout/BottomNavigation'
import { CookbookView } from '@/components/views/CookbookView'
import { DraftView } from '@/components/views/DraftView'
import { ActiveListView } from '@/components/views/ActiveListView'
import { HistoryView } from '@/components/views/HistoryView'

export default function App() {
  const { user, loading, household } = useAuth()
  const { draftItems, setActiveHousehold } = useShoppingStore()
  const [activeTab, setActiveTab] = useState<TabType>('cookbook')

  useEffect(() => {
    setActiveHousehold(household?.id ?? null)
  }, [household?.id, setActiveHousehold])


  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs tracking-wide">Ładowanie SmartShopping...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const getHeaderTitle = (tab: TabType): string => {
    switch (tab) {
      case 'cookbook':
        return 'Książka Kucharska'
      case 'draft':
        return 'Koszyk'
      case 'active':
        return 'Aktywna Lista Zakupów'
      case 'history':
        return 'Historia List'
      default:
        return 'SmartShopping'
    }
  }

  return (
    <MobileLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={getHeaderTitle(activeTab)}
      draftCount={draftItems.length}
    >
      {activeTab === 'cookbook' && <CookbookView />}
      {activeTab === 'draft' && (
        <DraftView onActiveListCreated={() => setActiveTab('active')} />
      )}
      {activeTab === 'active' && <ActiveListView />}
      {activeTab === 'history' && <HistoryView />}
    </MobileLayout>
  )
}

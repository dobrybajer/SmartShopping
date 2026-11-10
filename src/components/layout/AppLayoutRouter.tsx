import React, { Suspense, lazy, useState } from 'react'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import type { TabType } from '@/components/layout/BottomNavigation'

// Mobile Layout & Lazy Views
import { MobileLayout } from '@/components/layout/MobileLayout'
const CookbookView = lazy(() =>
  import('@/components/views/CookbookView').then((m) => ({ default: m.CookbookView }))
)
const ProductsView = lazy(() =>
  import('@/components/views/ProductsView').then((m) => ({ default: m.ProductsView }))
)
const CalendarView = lazy(() =>
  import('@/components/views/CalendarView').then((m) => ({ default: m.CalendarView }))
)
const DraftView = lazy(() =>
  import('@/components/views/DraftView').then((m) => ({ default: m.DraftView }))
)
const ActiveListView = lazy(() =>
  import('@/components/views/ActiveListView').then((m) => ({ default: m.ActiveListView }))
)
const HistoryView = lazy(() =>
  import('@/components/views/HistoryView').then((m) => ({ default: m.HistoryView }))
)
const PantryView = lazy(() =>
  import('@/components/views/PantryView').then((m) => ({ default: m.PantryView }))
)

// Desktop Layout & Lazy Views
const DesktopLayout = lazy(() =>
  import('@/components/layout/desktop/DesktopLayout').then((m) => ({ default: m.DesktopLayout }))
)
const DesktopCookbookView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopCookbookView').then((m) => ({
    default: m.DesktopCookbookView
  }))
)
const DesktopProductsView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopProductsView').then((m) => ({
    default: m.DesktopProductsView
  }))
)
const DesktopCalendarView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopCalendarView').then((m) => ({
    default: m.DesktopCalendarView
  }))
)
const DesktopDraftView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopDraftView').then((m) => ({
    default: m.DesktopDraftView
  }))
)
const DesktopActiveListView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopActiveListView').then((m) => ({
    default: m.DesktopActiveListView
  }))
)
const DesktopHistoryView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopHistoryView').then((m) => ({
    default: m.DesktopHistoryView
  }))
)
const DesktopPantryView = lazy(() =>
  import('@/components/layout/desktop/views/DesktopPantryView').then((m) => ({
    default: m.DesktopPantryView
  }))
)
import { useOfflineSync } from '@/hooks/useOfflineSync'

const ViewLoadingFallback: React.FC = () => (
  <div className="w-full h-48 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

export const AppLayoutRouter: React.FC = () => {
  useOfflineSync()
  const { isDesktop, layoutMode, setLayoutMode } = useDeviceLayout()
  const draftItems = useShoppingStore((state) => state.draftItems)
  const { t } = useTranslation()
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('smartshopping_active_tab') as TabType
      if (saved && ['cookbook', 'calendar', 'products', 'draft', 'active', 'history', 'pantry'].includes(saved)) {
        return saved
      }
    } catch {
      // Ignore
    }
    return 'cookbook'
  })

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab)
    try {
      localStorage.setItem('smartshopping_active_tab', tab)
    } catch {
      // Ignore
    }
  }

  const getHeaderTitle = (tab: TabType): string => {
    switch (tab) {
      case 'cookbook':
        return t('navigation.cookbook')
      case 'calendar':
        return t('navigation.calendar')
      case 'products':
        return t('navigation.products')
      case 'draft':
        return t('navigation.draft')
      case 'active':
        return t('navigation.activeList')
      case 'history':
        return t('navigation.history')
      case 'pantry':
        return t('navigation.pantry')
      default:
        return 'SmartShopping'
    }
  }

  const headerTitle = getHeaderTitle(activeTab)

  // 1. Desktop Layout (Devices >= 13 inches / >= 1024px or manual desktop override)
  if (isDesktop) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <DesktopLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          headerTitle={headerTitle}
          draftCount={draftItems.length}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        >
          <Suspense fallback={<ViewLoadingFallback />}>
            {activeTab === 'cookbook' && <DesktopCookbookView />}
            {activeTab === 'calendar' && <DesktopCalendarView />}
            {activeTab === 'products' && <DesktopProductsView />}
            {activeTab === 'draft' && (
              <DesktopDraftView onActiveListCreated={() => setActiveTab('active')} />
            )}
            {activeTab === 'active' && <DesktopActiveListView />}
            {activeTab === 'history' && <DesktopHistoryView />}
            {activeTab === 'pantry' && <DesktopPantryView />}
          </Suspense>
        </DesktopLayout>
      </Suspense>
    )
  }

  // 2. Mobile Layout (Current layout untouched for smartphones & mobile screens)
  return (
    <MobileLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerTitle={headerTitle}
      draftCount={draftItems.length}
    >
      <Suspense fallback={<ViewLoadingFallback />}>
        {activeTab === 'cookbook' && <CookbookView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'draft' && (
          <DraftView onActiveListCreated={() => setActiveTab('active')} />
        )}
        {activeTab === 'active' && <ActiveListView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'pantry' && <PantryView />}
      </Suspense>
    </MobileLayout>
  )
}

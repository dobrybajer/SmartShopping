import React, { useState } from 'react'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import type { TabType } from '@/components/layout/BottomNavigation'

// Mobile Layout & Views
import { MobileLayout } from '@/components/layout/MobileLayout'
import { CookbookView } from '@/components/views/CookbookView'
import { ProductsView } from '@/components/views/ProductsView'
import { DraftView } from '@/components/views/DraftView'
import { ActiveListView } from '@/components/views/ActiveListView'
import { HistoryView } from '@/components/views/HistoryView'

// Desktop Layout & Views
import { DesktopLayout } from '@/components/layout/desktop/DesktopLayout'
import { DesktopCookbookView } from '@/components/layout/desktop/views/DesktopCookbookView'
import { DesktopProductsView } from '@/components/layout/desktop/views/DesktopProductsView'
import { DesktopDraftView } from '@/components/layout/desktop/views/DesktopDraftView'
import { DesktopActiveListView } from '@/components/layout/desktop/views/DesktopActiveListView'
import { DesktopHistoryView } from '@/components/layout/desktop/views/DesktopHistoryView'

export const AppLayoutRouter: React.FC = () => {
  const { isDesktop, layoutMode, setLayoutMode } = useDeviceLayout()
  const { draftItems } = useShoppingStore()
  const { t } = useTranslation()
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('smartshopping_active_tab') as TabType
      if (saved && ['cookbook', 'products', 'draft', 'active', 'history'].includes(saved)) {
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
      case 'products':
        return t('navigation.products')
      case 'draft':
        return t('navigation.draft')
      case 'active':
        return t('navigation.activeList')
      case 'history':
        return t('navigation.history')
      default:
        return 'SmartShopping'
    }
  }

  const headerTitle = getHeaderTitle(activeTab)

  // 1. Desktop Layout (Devices >= 13 inches / >= 1024px or manual desktop override)
  if (isDesktop) {
    return (
      <DesktopLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerTitle={headerTitle}
        draftCount={draftItems.length}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      >
        {activeTab === 'cookbook' && <DesktopCookbookView />}
        {activeTab === 'products' && <DesktopProductsView />}
        {activeTab === 'draft' && (
          <DesktopDraftView onActiveListCreated={() => setActiveTab('active')} />
        )}
        {activeTab === 'active' && <DesktopActiveListView />}
        {activeTab === 'history' && <DesktopHistoryView />}
      </DesktopLayout>
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
      {activeTab === 'cookbook' && <CookbookView />}
      {activeTab === 'products' && <ProductsView />}
      {activeTab === 'draft' && (
        <DraftView onActiveListCreated={() => setActiveTab('active')} />
      )}
      {activeTab === 'active' && <ActiveListView />}
      {activeTab === 'history' && <HistoryView />}
    </MobileLayout>
  )
}

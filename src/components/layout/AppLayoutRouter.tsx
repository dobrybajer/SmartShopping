import React, { useState } from 'react'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useShoppingStore } from '@/store/useShoppingStore'
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
  const [activeTab, setActiveTab] = useState<TabType>('cookbook')

  const getHeaderTitle = (tab: TabType): string => {
    switch (tab) {
      case 'cookbook':
        return 'Książka Kucharska'
      case 'products':
        return 'Baza Produktów'
      case 'draft':
        return 'Koszyk Roboczy'
      case 'active':
        return 'Aktywna Lista Zakupów'
      case 'history':
        return 'Historia List Zakupowych'
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

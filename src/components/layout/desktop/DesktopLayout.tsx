import React from 'react'
import { DesktopSidebar } from './DesktopSidebar'
import { DesktopHeader } from './DesktopHeader'
import type { TabType } from '@/components/layout/BottomNavigation'
import type { LayoutMode } from '@/hooks/useDeviceLayout'

interface DesktopLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  headerTitle: string
  draftCount?: number
  activeCount?: number
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  headerTitle,
  draftCount = 0,
  activeCount = 0,
  layoutMode = 'auto',
  onLayoutModeChange
}) => {
  return (
    <div className="w-full h-screen bg-background text-foreground flex overflow-hidden font-sans select-none antialiased">
      {/* Left Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        draftCount={draftCount}
        activeCount={activeCount}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        {/* Desktop Header */}
        <DesktopHeader title={headerTitle} />

        {/* Scrollable Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto p-8 lg:px-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

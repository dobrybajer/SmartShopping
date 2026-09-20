import React, { useState, useEffect, useCallback } from 'react'
import { DesktopSidebar } from './DesktopSidebar'
import { DesktopHeader } from './DesktopHeader'
import { JsonRecipeImportDialog } from '@/components/dialogs/JsonRecipeImportDialog'
import { NotificationPromptBanner } from '@/components/notifications/NotificationPromptBanner'
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
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false)

  // Global Keyboard Shortcut: Ctrl + Alt + P (or Cmd + Option + P on Mac) - Desktop Only
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')
      ) {
        e.preventDefault()
        e.stopPropagation()
        setIsJsonImportOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleJsonImportSuccess = useCallback(() => {
    onTabChange('cookbook')
  }, [onTabChange])

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
        <DesktopHeader
          title={headerTitle}
          onOpenJsonImport={() => setIsJsonImportOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto p-8 lg:px-10 max-w-[1600px] w-full mx-auto">
          <NotificationPromptBanner layout="desktop" />
          {children}
        </main>
      </div>

      {/* Desktop-exclusive JSON Recipe Import Dialog */}
      <JsonRecipeImportDialog
        open={isJsonImportOpen}
        onOpenChange={setIsJsonImportOpen}
        onSuccess={handleJsonImportSuccess}
      />
    </div>
  )
}


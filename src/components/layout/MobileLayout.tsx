import { AppHeader } from './AppHeader'
import { BottomNavigation } from './BottomNavigation'
import { NotificationPromptBanner } from '@/components/notifications/NotificationPromptBanner'
import type { TabType } from './BottomNavigation'
import type { LayoutMode } from '@/hooks/useDeviceLayout'

interface MobileLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  headerTitle: string
  draftCount?: number
  activeCount?: number
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  headerTitle,
  draftCount = 0,
  activeCount = 0,
  layoutMode,
  onLayoutModeChange
}) => {
  return (
    <div className="max-w-md mx-auto h-[100dvh] h-screen max-h-[100dvh] bg-background text-foreground flex flex-col justify-between relative border-x border-border shadow-2xl overflow-hidden select-none font-sans">
      <div className="shrink-0 z-30">
        <AppHeader
          title={headerTitle}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
        />
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto p-4 pb-6 flex flex-col gap-4 overscroll-contain">
        {children}
      </main>

      <div className="shrink-0 z-30 flex flex-col">
        <NotificationPromptBanner layout="mobile" />
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={onTabChange}
          draftCount={draftCount}
          activeCount={activeCount}
        />
      </div>
    </div>
  )
}


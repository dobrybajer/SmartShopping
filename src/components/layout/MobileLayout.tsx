import { AppHeader } from './AppHeader'
import { BottomNavigation } from './BottomNavigation'
import type { TabType } from './BottomNavigation'

interface MobileLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  headerTitle: string
  draftCount?: number
  activeCount?: number
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  headerTitle,
  draftCount = 0,
  activeCount = 0
}) => {
  return (
    <div className="max-w-md mx-auto h-[100dvh] h-screen max-h-[100dvh] bg-black text-white flex flex-col justify-between relative border-x border-zinc-900 shadow-2xl overflow-hidden select-none font-sans">
      <div className="shrink-0 z-30">
        <AppHeader title={headerTitle} />
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto p-4 pb-6 flex flex-col gap-4 overscroll-contain">
        {children}
      </main>

      <div className="shrink-0 z-30">
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


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
    <div className="max-w-md mx-auto min-h-screen bg-black text-white flex flex-col justify-between relative border-x border-zinc-900 shadow-2xl overflow-x-hidden select-none font-sans">
      <AppHeader title={headerTitle} />

      <main className="flex-1 p-4 pb-8 flex flex-col gap-4 overflow-y-auto">
        {children}
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        draftCount={draftCount}
        activeCount={activeCount}
      />
    </div>
  )
}

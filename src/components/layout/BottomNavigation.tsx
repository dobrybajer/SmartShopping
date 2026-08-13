import React from 'react'
import { BookOpen, ShoppingCart, CheckSquare, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabType = 'cookbook' | 'draft' | 'active' | 'history'

interface BottomNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  draftCount?: number
  activeCount?: number
}

interface NavItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  draftCount = 0,
  activeCount = 0
}) => {
  const items: NavItem[] = [
    {
      id: 'cookbook',
      label: 'Przepisy',
      icon: BookOpen
    },
    {
      id: 'draft',
      label: 'Koszyk',
      icon: ShoppingCart,
      badge: draftCount
    },
    {
      id: 'active',
      label: 'Lista',
      icon: CheckSquare,
      badge: activeCount
    },
    {
      id: 'history',
      label: 'Historia',
      icon: History
    }
  ]

  const handleSelect = (tab: TabType) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20)
      } catch {
        // Ignoruj jeśli nieobsługiwane
      }
    }
    onTabChange(tab)
  }

  return (
    <nav className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-3 py-2 flex items-center justify-around sticky bottom-0 z-30 select-none shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative group",
              isActive
                ? "text-emerald-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform group-active:scale-90",
                  isActive && "scale-110"
                )}
              />

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-black text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-50">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>

            {/* Active Pill Indicator */}
            {isActive && (
              <span className="absolute -bottom-1 w-4 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

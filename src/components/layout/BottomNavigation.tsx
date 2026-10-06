import React from 'react'
import { BookOpen, Package, ShoppingCart, CheckSquare, History, Warehouse, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'

export type TabType = 'cookbook' | 'calendar' | 'products' | 'draft' | 'active' | 'history' | 'pantry'

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
  const { t } = useTranslation()

  const items: NavItem[] = [
    {
      id: 'cookbook',
      label: t('navigation.cookbook'),
      icon: BookOpen
    },
    {
      id: 'calendar',
      label: t('navigation.calendar'),
      icon: Calendar
    },
    {
      id: 'products',
      label: t('navigation.products'),
      icon: Package
    },
    {
      id: 'draft',
      label: t('navigation.draft'),
      icon: ShoppingCart,
      badge: draftCount
    },
    {
      id: 'active',
      label: t('navigation.activeList'),
      icon: CheckSquare,
      badge: activeCount
    },
    {
      id: 'history',
      label: t('navigation.history'),
      icon: History
    },
    {
      id: 'pantry',
      label: t('navigation.pantry'),
      icon: Warehouse
    }
  ]

  const handleSelect = (tab: TabType) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20)
      } catch {
        // Ignore if unsupported
      }
    }
    onTabChange(tab)
  }

  return (
    <nav className="bg-card/95 backdrop-blur-md border-t border-border px-1 py-1.5 flex items-center justify-around sticky bottom-0 z-30 select-none shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative group cursor-pointer min-w-0 flex-1 max-w-[56px]",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-active:scale-90",
                  isActive && "scale-110"
                )}
              />

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-in zoom-in-50">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full text-center">
              {item.label}
            </span>

            {/* Active Pill Indicator */}
            {isActive && (
              <span className="absolute -bottom-1 w-3.5 h-0.5 bg-primary rounded-full shadow-sm" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

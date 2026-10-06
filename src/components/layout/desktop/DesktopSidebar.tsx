import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { AppLogo } from '@/components/ui/AppLogo'
import { AccountDetailsDialog } from '@/components/dialogs/AccountDetailsDialog'
import { HouseholdsDialog } from '@/components/dialogs/HouseholdsDialog'
import type { TabType } from '@/components/layout/BottomNavigation'
import type { LayoutMode } from '@/hooks/useDeviceLayout'
import {
  BookOpen,
  Package,
  ShoppingCart,
  CheckSquare,
  History,
  Home,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Laptop,
  Smartphone,
  SlidersHorizontal,
  Warehouse,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DesktopSidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  draftCount?: number
  activeCount?: number
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
}

interface NavItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  description: string
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  draftCount = 0,
  activeCount = 0,
  layoutMode = 'auto',
  onLayoutModeChange
}) => {
  const { user, userProfile, household, userHouseholds, signOut } = useAuth()
  const { t } = useTranslation()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isHouseholdsDialogOpen, setIsHouseholdsDialogOpen] = useState(false)
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const layoutMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(event.target as Node)) {
        setIsLayoutMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = userProfile?.name || user?.email?.split('@')[0] || t('navigation.profile')
  const userInitial = displayName.charAt(0).toUpperCase() || 'U'

  const navItems: NavItem[] = [
    {
      id: 'cookbook',
      label: t('navigation.cookbook'),
      description: t('cookbook.subtitle'),
      icon: BookOpen
    },
    {
      id: 'calendar',
      label: t('navigation.calendar'),
      description: t('calendar.title'),
      icon: Calendar
    },
    {
      id: 'products',
      label: t('navigation.products'),
      description: t('products.subtitle'),
      icon: Package
    },
    {
      id: 'draft',
      label: t('navigation.draft'),
      description: t('draft.subtitle'),
      icon: ShoppingCart,
      badge: draftCount
    },
    {
      id: 'active',
      label: t('navigation.activeList'),
      description: t('activeList.subtitle'),
      icon: CheckSquare,
      badge: activeCount
    },
    {
      id: 'history',
      label: t('navigation.history'),
      description: t('history.subtitle'),
      icon: History
    },
    {
      id: 'pantry',
      label: t('navigation.pantry'),
      description: t('pantry.subtitle'),
      icon: Warehouse
    }
  ]

  return (
    <>
      <aside className="w-72 h-screen bg-card border-r border-border flex flex-col justify-between select-none z-30 shrink-0 shadow-2xl backdrop-blur-xl">
        {/* Top: Logo & Household selector */}
        <div className="p-5 flex flex-col gap-4">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center p-1.5 shadow-inner">
              <AppLogo size={32} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-foreground">Smart Shopping</span>
              <span className="text-[11px] text-muted-foreground">{t('common.brandTagline')}</span>
            </div>
          </div>

          {/* Active Household Widget */}
          <div
            onClick={() => setIsHouseholdsDialogOpen(true)}
            className="p-3 rounded-2xl bg-background/60 border border-border hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer group flex items-center justify-between shadow-xs"
            title={t('navigation.households')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {t('navigation.households')}
                </span>
                <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {household?.name || t('dialogs.households.currentHousehold')}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-md group-hover:border-primary/30 group-hover:text-primary transition-colors shrink-0">
              {userHouseholds.length}
            </span>
          </div>
        </div>

        {/* Center: Main Navigation List */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('navigation.profile')}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer relative",
                  isActive
                    ? "bg-primary/10 border border-primary/30 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "bg-background border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border/80"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-xs font-bold leading-tight truncate", isActive ? "text-foreground" : "")}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 shadow-xs",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-primary"
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-sm" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: Layout Switcher & User Profile */}
        <div className="p-3 border-t border-border flex flex-col gap-2 bg-card/80">
          {/* Layout Mode Control */}
          {onLayoutModeChange && (
            <div className="relative" ref={layoutMenuRef}>
              <button
                onClick={() => setIsLayoutMenuOpen((prev) => !prev)}
                className="w-full px-3 py-2 rounded-xl bg-background/50 hover:bg-background border border-border text-muted-foreground hover:text-foreground text-xs flex items-center justify-between transition-colors cursor-pointer"
                title={t('dialogs.layout.mode')}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>{t('dialogs.layout.mode')} <strong className="text-foreground font-semibold">{layoutMode === 'auto' ? t('dialogs.layout.auto') : layoutMode === 'desktop' ? t('dialogs.layout.desktop') : t('dialogs.layout.mobile')}</strong></span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isLayoutMenuOpen && "rotate-180")} />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-full rounded-2xl bg-card border border-border p-1.5 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      onLayoutModeChange('auto')
                      setIsLayoutMenuOpen(false)
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
                      layoutMode === 'auto' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{t('dialogs.layout.auto')}</span>
                  </button>
                  <button
                    onClick={() => {
                      onLayoutModeChange('desktop')
                      setIsLayoutMenuOpen(false)
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
                      layoutMode === 'desktop' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>{t('dialogs.layout.desktop')}</span>
                  </button>
                  <button
                    onClick={() => {
                      onLayoutModeChange('mobile')
                      setIsLayoutMenuOpen(false)
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
                      layoutMode === 'mobile' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t('dialogs.layout.mobile')}</span>
                  </button>

                  <div className="pt-1.5 mt-1 border-t border-border px-2.5 pb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('dialogs.layout.shortcut')}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground font-mono text-[9px] font-semibold">
                      Ctrl + Alt + L
                    </kbd>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Card */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className={cn(
                "w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer group",
                isUserMenuOpen
                  ? "bg-muted border-primary/60 shadow-md ring-2 ring-primary/20"
                  : "bg-background/60 border-border hover:border-border/80 hover:bg-muted"
              )}
              title={t('navigation.profile')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shadow-inner shrink-0">
                  {userInitial}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono">
                    {user?.email}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
                  isUserMenuOpen && "rotate-180 text-primary"
                )}
              />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-full rounded-2xl bg-card border border-border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-border flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground truncate">{displayName}</span>
                    <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {t('dialogs.households.activeBadge')}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono truncate">{user?.email}</span>
                </div>

                <div className="flex flex-col gap-1 py-1.5">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsAccountDialogOpen(true)
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <span>{t('navigation.account')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsHouseholdsDialogOpen(true)
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Home className="w-4 h-4 text-primary" />
                      <span>{t('navigation.households')}</span>
                    </div>
                    {userHouseholds.length > 0 && (
                      <span className="text-[10px] font-mono bg-background text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">
                        {userHouseholds.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="border-t border-border my-1" />

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    signOut()
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('navigation.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <AccountDetailsDialog
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
      />
      <HouseholdsDialog
        open={isHouseholdsDialogOpen}
        onOpenChange={setIsHouseholdsDialogOpen}
      />
    </>
  )
}

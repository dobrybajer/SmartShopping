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
  SlidersHorizontal
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
    }
  ]

  return (
    <>
      <aside className="w-72 h-screen bg-zinc-950/95 border-r border-zinc-900 flex flex-col justify-between select-none z-30 shrink-0 shadow-2xl backdrop-blur-xl">
        {/* Top: Logo & Household selector */}
        <div className="p-5 flex flex-col gap-4">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center p-1.5 shadow-inner">
              <AppLogo size={32} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Smart Shopping</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pro
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">{t('common.brandTagline')}</span>
            </div>
          </div>

          {/* Active Household Widget */}
          <div
            onClick={() => setIsHouseholdsDialogOpen(true)}
            className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all cursor-pointer group flex items-center justify-between shadow-xs"
            title={t('navigation.households')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  {t('navigation.households')}
                </span>
                <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-emerald-300 transition-colors">
                  {household?.name || t('dialogs.households.currentHousehold')}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60 px-1.5 py-0.5 rounded-md group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors shrink-0">
              {userHouseholds.length}
            </span>
          </div>
        </div>

        {/* Center: Main Navigation List */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                      isActive
                        ? "bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-700"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-xs font-bold leading-tight truncate", isActive ? "text-zinc-100" : "")}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-zinc-500 leading-tight truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 shadow-xs",
                      isActive
                        ? "bg-emerald-500 text-black"
                        : "bg-zinc-800 border border-zinc-700 text-emerald-400"
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: Layout Switcher & User Profile */}
        <div className="p-3 border-t border-zinc-900 flex flex-col gap-2 bg-zinc-950/80">
          {/* Layout Mode Control */}
          {onLayoutModeChange && (
            <div className="relative" ref={layoutMenuRef}>
              <button
                onClick={() => setIsLayoutMenuOpen((prev) => !prev)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center justify-between transition-colors cursor-pointer"
                title={t('dialogs.layout.mode')}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('dialogs.layout.mode')} <strong className="text-zinc-200 font-semibold">{layoutMode === 'auto' ? t('dialogs.layout.auto') : layoutMode === 'desktop' ? t('dialogs.layout.desktop') : t('dialogs.layout.mobile')}</strong></span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isLayoutMenuOpen && "rotate-180")} />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-1.5 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      onLayoutModeChange('auto')
                      setIsLayoutMenuOpen(false)
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer",
                      layoutMode === 'auto' ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
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
                      layoutMode === 'desktop' ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
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
                      layoutMode === 'mobile' ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t('dialogs.layout.mobile')}</span>
                  </button>

                  <div className="pt-1.5 mt-1 border-t border-zinc-900 px-2.5 pb-1 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{t('dialogs.layout.shortcut')}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] font-semibold">
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
                  ? "bg-zinc-900 border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
              )}
              title={t('navigation.profile')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner shrink-0">
                  {userInitial}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate font-mono">
                    {user?.email}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0",
                  isUserMenuOpen && "rotate-180 text-emerald-400"
                )}
              />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-zinc-900 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-100 truncate">{displayName}</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {t('dialogs.households.activeBadge')}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</span>
                </div>

                <div className="flex flex-col gap-1 py-1.5">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsAccountDialogOpen(true)
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>{t('navigation.account')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsHouseholdsDialogOpen(true)
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Home className="w-4 h-4 text-emerald-400" />
                      <span>{t('navigation.households')}</span>
                    </div>
                    {userHouseholds.length > 0 && (
                      <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md">
                        {userHouseholds.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="border-t border-zinc-900 my-1" />

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    signOut()
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5 cursor-pointer"
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

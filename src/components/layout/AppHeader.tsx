import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { useDeviceLayout, type LayoutMode } from '@/hooks/useDeviceLayout'
import { AppLogo } from '@/components/ui/AppLogo'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { AccountDetailsDialog } from '@/components/dialogs/AccountDetailsDialog'
import { HouseholdsDialog } from '@/components/dialogs/HouseholdsDialog'
import {
  User,
  Home,
  LogOut,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Laptop,
  Smartphone
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title: string
  layoutMode?: LayoutMode
  onLayoutModeChange?: (mode: LayoutMode) => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  layoutMode,
  onLayoutModeChange
}) => {
  const { user, userProfile, household, userHouseholds, signOut } = useAuth()
  const { t } = useTranslation()
  const deviceLayout = useDeviceLayout()
  const activeLayoutMode = layoutMode ?? deviceLayout.layoutMode
  const handleLayoutModeChange = onLayoutModeChange ?? deviceLayout.setLayoutMode

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isHouseholdsDialogOpen, setIsHouseholdsDialogOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const displayName = userProfile?.name || user?.email?.split('@')[0] || t('navigation.profile')
  const userInitial = displayName.charAt(0).toUpperCase() || 'U'

  return (
    <>
      <header className="px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-30 flex items-center justify-between shadow-md select-none">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center p-1 shrink-0">
            <AppLogo size={28} />
          </div>

          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight leading-none">
              {title}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>{household?.name || t('dialogs.households.currentHousehold')}</span>
            </p>
          </div>
        </div>

        {/* Right: User Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-full border transition-all cursor-pointer select-none",
              isMenuOpen
                ? "bg-muted border-primary/80 shadow-md ring-2 ring-primary/20"
                : "bg-background border-border hover:border-border/80 hover:bg-muted"
            )}
            title={t('navigation.profile')}
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shadow-inner">
              {userInitial}
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                isMenuOpen && "rotate-180 text-primary"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-card border border-border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile header */}
              <div className="px-3 py-2.5 border-b border-border flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground truncate">{displayName}</span>
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> {t('dialogs.households.activeBadge')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate font-mono">{user?.email}</span>
                <span className="text-[11px] text-muted-foreground truncate mt-1 flex items-center gap-1">
                  <Home className="w-3 h-3 text-primary shrink-0" />
                  <strong className="text-foreground font-normal">{household?.name}</strong>
                </span>
              </div>

              {/* Menu options */}
              <div className="flex flex-col gap-1 py-1.5">
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsAccountDialogOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <span>{t('navigation.account')}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsHouseholdsDialogOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors">
                      <Home className="w-4 h-4" />
                    </div>
                    <span>{t('navigation.households')}</span>
                  </div>
                  {userHouseholds.length > 0 && (
                    <span className="text-[10px] font-mono bg-background text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">
                      {userHouseholds.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Separator */}
              <div className="border-t border-border my-1" />

              {/* Layout Mode & Language Switcher (HIGH-10) */}
              <div className="px-2.5 py-1.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {t('common.language')}
                  </span>
                  <LanguageSwitcher variant="pill" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3 h-3 text-primary" />
                    <span>{t('dialogs.layout.mode')}</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-background/60 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        handleLayoutModeChange('auto')
                        setIsMenuOpen(false)
                      }}
                      className={cn(
                        'py-1.5 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer',
                        activeLayoutMode === 'auto'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <SlidersHorizontal className="w-3 h-3 shrink-0" />
                      <span className="truncate">{t('dialogs.layout.auto')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLayoutModeChange('desktop')
                        setIsMenuOpen(false)
                      }}
                      className={cn(
                        'py-1.5 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer',
                        activeLayoutMode === 'desktop'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Laptop className="w-3 h-3 shrink-0" />
                      <span className="truncate">Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLayoutModeChange('mobile')
                        setIsMenuOpen(false)
                      }}
                      className={cn(
                        'py-1.5 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer',
                        activeLayoutMode === 'mobile'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Smartphone className="w-3 h-3 shrink-0" />
                      <span className="truncate">Mobile</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-border my-1" />

              {/* Logout */}
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  signOut()
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>{t('navigation.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Management Dialogs */}
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

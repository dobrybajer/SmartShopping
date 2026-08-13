import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { AppLogo } from '@/components/ui/AppLogo'
import { AccountDetailsDialog } from '@/components/dialogs/AccountDetailsDialog'
import { HouseholdsDialog } from '@/components/dialogs/HouseholdsDialog'
import { User, Home, LogOut, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title: string
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const { user, userProfile, household, userHouseholds, signOut } = useAuth()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isHouseholdsDialogOpen, setIsHouseholdsDialogOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // Zamknij menu po kliknięciu poza obszar dropdowna
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

  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'Użytkownik'
  const userInitial = displayName.charAt(0).toUpperCase() || 'U'

  return (
    <>
      <header className="px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30 flex items-center justify-between shadow-md">
        {/* Lewa strona: Logo i Tytuł */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-1 shrink-0">
            <AppLogo size={28} />
          </div>

          <div>
            <h1 className="font-bold text-sm text-zinc-100 tracking-tight leading-none">
              {title}
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[180px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{household?.name || 'Gospodarstwo domowe'}</span>
            </p>
          </div>
        </div>

        {/* Prawa strona: Ikona użytkownika z rozwijanym menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-full border transition-all cursor-pointer select-none",
              isMenuOpen
                ? "bg-zinc-800 border-emerald-500/80 shadow-md ring-2 ring-emerald-500/20"
                : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
            )}
            title="Menu profilu użytkownika"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner">
              {userInitial}
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-zinc-400 transition-transform duration-200",
                isMenuOpen && "rotate-180 text-emerald-400"
              )}
            />
          </button>

          {/* Rozwijane Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Nagłówek profilu */}
              <div className="px-3 py-2.5 border-b border-zinc-900 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-100 truncate">{displayName}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Aktywny
                  </span>
                </div>
                <span className="text-xs text-zinc-500 truncate font-mono">{user?.email}</span>
                <span className="text-[11px] text-zinc-400 truncate mt-1 flex items-center gap-1">
                  <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                  <strong className="text-zinc-200 font-normal">{household?.name}</strong>
                </span>
              </div>

              {/* Opcje menu */}
              <div className="flex flex-col gap-1 py-1.5">
                {/* 1. Dane Konta */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsAccountDialogOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <span>Dane Konta</span>
                  </div>
                </button>

                {/* 2. Gospodarstwa */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsHouseholdsDialogOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                      <Home className="w-4 h-4" />
                    </div>
                    <span>Gospodarstwa</span>
                  </div>
                  {userHouseholds.length > 0 && (
                    <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md">
                      {userHouseholds.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Separator */}
              <div className="border-t border-zinc-900 my-1" />

              {/* 3. Wyloguj */}
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  signOut()
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Wyloguj się</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modale zarządzania */}
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

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { Plus, ChevronDown, BookOpen, Package, ShoppingBag, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface DesktopHeaderProps {
  title: string
  subtitle?: string
  onRefreshData?: () => void
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  title,
  subtitle
}) => {
  const { household } = useAuth()
  const { t } = useTranslation()

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isAddAdHocOpen, setIsAddAdHocOpen] = useState(false)

  const quickAddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="h-16 px-8 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between sticky top-0 z-20 select-none">
        {/* Left: Breadcrumbs & Dynamic Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <span>Smart Shopping</span>
            <span>/</span>
            <span className="text-emerald-400 font-semibold">{household?.name || t('navigation.households')}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold text-zinc-100 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="text-xs text-zinc-400 border-l border-zinc-800 pl-3">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Language Switcher, Quick Action & Live Status */}
        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <LanguageSwitcher variant="pill" />

          {/* Realtime Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>{t('common.realtime')}</span>
            </span>
          </div>

          {/* Global Quick Add Action */}
          <div className="relative" ref={quickAddRef}>
            <button
              onClick={() => setIsQuickAddOpen((prev) => !prev)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/30 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('common.add')}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isQuickAddOpen && "rotate-180")} />
            </button>

            {isQuickAddOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false)
                    setIsAddMealOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block">{t('cookbook.addRecipe')}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{t('navigation.cookbook')}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsQuickAddOpen(false)
                    setIsAddProductOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block">{t('products.addProduct')}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{t('navigation.products')}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsQuickAddOpen(false)
                    setIsAddAdHocOpen(true)
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block">{t('dialogs.adHoc.title')}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{t('navigation.draft')}</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Modals opened from Header Quick Actions */}
      <AddMealSheet
        open={isAddMealOpen}
        onOpenChange={setIsAddMealOpen}
        onMealCreated={() => {
          window.dispatchEvent(new CustomEvent('smartshopping_refresh_meals'))
        }}
      />

      <ProductFormSheet
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onProductSaved={() => {
          window.dispatchEvent(new CustomEvent('smartshopping_refresh_products'))
        }}
      />

      <AddAdHocSheet
        open={isAddAdHocOpen}
        onOpenChange={setIsAddAdHocOpen}
      />
    </>
  )
}

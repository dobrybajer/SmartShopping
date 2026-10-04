import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePantryStore } from '@/store/usePantryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTranslation } from '@/i18n'
import type { PantryItemWithDetails } from '@/types/pantry'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { getNextQuantity, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { AddPantryItemDialog } from '@/components/dialogs/AddPantryItemDialog'
import {
  Warehouse,
  Plus,
  Minus,
  Search,
  Trash2,
  Package,
  CheckCircle2,
  Calendar
} from 'lucide-react'

export const DesktopPantryView: React.FC = () => {
  const { household } = useAuth()
  const {
    pantryItems,
    isLoading,
    loadPantryItems,
    updatePantryQuantity,
    deletePantryItem
  } = usePantryStore()
  const { categoriesByHousehold, loadCategories } = useCategoryStore()
  const { t, formatUnit, formatQuantity, formatDate } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PantryItemWithDetails | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const householdId = household?.id

  useEffect(() => {
    if (householdId) {
      loadPantryItems(householdId)
      loadCategories(householdId)
    }
  }, [householdId, loadPantryItems, loadCategories])

  const householdKey = householdId || 'global'
  const resolvedCategories = useMemo(
    () => categoriesByHousehold[householdKey] || [],
    [categoriesByHousehold, householdKey]
  )

  // Filter items by search text & category filter
  const filteredItems = useMemo(() => {
    return pantryItems.filter((item) => {
      const name = (item.product?.name || item.ad_hoc_name || '').toLowerCase()
      const matchesSearch = name.includes(searchQuery.toLowerCase().trim())
      const catId = item.category_id ?? item.product?.category_id
      const matchesCategory = selectedCategoryFilter === null || catId === selectedCategoryFilter
      return matchesSearch && matchesCategory
    })
  }, [pantryItems, searchQuery, selectedCategoryFilter])

  // Group items by resolved aisle hierarchy
  const groupedAisles = useMemo(() => {
    return groupItemsByAisle(filteredItems, resolvedCategories, 'other')
  }, [filteredItems, resolvedCategories])

  // Freshness statistics
  const stats = useMemo(() => {
    let fresh = 0
    let medium = 0
    let old = 0

    pantryItems.forEach((item) => {
      const isNonFood = !!(
        item.category?.is_non_food ||
        item.product?.category?.is_non_food
      )
      const res = calculatePantryFreshness(
        item.last_purchased_at,
        isNonFood,
        item.product?.name || item.ad_hoc_name || '',
        '1',
        item.last_verified_at
      )
      if (res.level === 'fresh') fresh++
      else if (res.level === 'medium') medium++
      else old++
    })

    return { fresh, medium, old, total: pantryItems.length }
  }, [pantryItems])

  const handleIncrease = (item: PantryItemWithDetails) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
    updatePantryQuantity(item.id, newQty)
  }

  const handleDecrease = (item: PantryItemWithDetails) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
    if (newQty <= 0) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
    } else {
      updatePantryQuantity(item.id, newQty)
    }
  }

  const handleCommitEdit = (itemId: string) => {
    const parsed = parseFloat(editValue)
    if (!isNaN(parsed) && parsed > 0) {
      updatePantryQuantity(itemId, parsed)
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deletePantryItem(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Card & Stats Banner */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-md flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{t('pantry.title')}</h2>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                  {pantryItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('pantry.subtitle')}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            size="lg"
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>

        {/* 2. Breakdown Pills & Search Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/80 items-center">
          <div className="md:col-span-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Świeże / niedawno:</span>
              <strong className="text-foreground font-mono">{stats.fresh}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Weryfikacja:</span>
              <strong className="text-foreground font-mono">{stats.medium}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Dawno / uzupełnij:</span>
              <strong className="text-foreground font-mono">{stats.old}</strong>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pantry.searchPlaceholder')}
              className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        {resolvedCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-border/40">
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer select-none border",
                selectedCategoryFilter === null
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t('common.all')}
            </button>

            {resolvedCategories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? null : cat.id)}
                  className={cn(
                    "h-8 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer select-none border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {getCategoryLabel(cat.name)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Items Multi-Column Layout */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : pantryItems.length === 0 ? (
        <div className="py-20 px-6 bg-card/60 border border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Warehouse className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('pantry.emptyTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {t('pantry.emptySubtitle')}
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="mt-5 h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupedAisles.map((group, index) => (
            <div
              key={group.categoryId ?? `pantry_group_${group.name}`}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  <span>
                    {group.sort_order !== 99999
                      ? `${index + 1}. ${getCategoryLabel(group.name)}`
                      : getCategoryLabel(group.name)}
                  </span>
                </h4>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {group.items.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.items.map((item) => {
                  const name = item.product?.name || item.ad_hoc_name || 'Product'
                  const isNonFood = !!(
                    item.category?.is_non_food ||
                    item.product?.category?.is_non_food
                  )
                  const freshness = calculatePantryFreshness(
                    item.last_purchased_at,
                    isNonFood,
                    name,
                    formatQuantity(item.quantity, item.unit_type),
                    item.last_verified_at
                  )

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-3 transition-all hover:border-border select-none"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {name}
                          </span>
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shrink-0",
                              freshness.level === 'fresh' && "bg-emerald-500",
                              freshness.level === 'medium' && "bg-amber-500",
                              freshness.level === 'old' && "bg-rose-500",
                              freshness.level === 'unknown' && "bg-muted-foreground"
                            )}
                            title={t(freshness.messageKey as any, freshness.translationParams as any)}
                          />
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {item.last_purchased_at && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.last_purchased_at)}</span>
                            </span>
                          )}
                          {item.last_verified_at && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('pantry.verifiedBadge')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper +/- & Delete Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title={t('common.decrease')}
                            aria-label={t('common.decrease')}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {editingId === item.id ? (
                            <div className="flex items-center gap-1 px-1.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCommitEdit(item.id)
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null)
                                    setEditValue('')
                                  }
                                }}
                                onBlur={() => handleCommitEdit(item.id)}
                                className="w-16 h-8 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
                              />
                              <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                                {formatUnit(item.unit_type)}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(item.id)
                                setEditValue(String(item.quantity))
                              }}
                              className="font-mono text-xs px-3 py-1 font-bold min-w-[4.5rem] text-center text-primary hover:bg-muted rounded-lg transition-colors cursor-text select-none"
                              title={t('common.edit')}
                            >
                              {formatQuantity(item.quantity, item.unit_type)}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleIncrease(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title={t('common.increase')}
                            aria-label={t('common.increase')}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(item)
                            setIsDeleteModalOpen(true)
                          }}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pantry Item Dialog */}
      <AddPantryItemDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={itemToDelete?.product?.name || itemToDelete?.ad_hoc_name || undefined}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

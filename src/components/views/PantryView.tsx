import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePantryStore } from '@/store/usePantryStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTranslation } from '@/i18n'
import type { PantryItemWithDetails } from '@/types/pantry'
import { groupItemsByAisle } from '@/lib/calculations/categorySorting'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { getNextQuantity, cn } from '@/lib/utils'
import { SwipeToDismiss } from '@/components/ui/SwipeToDismiss'
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
  CheckCircle2,
  Calendar
} from 'lucide-react'

export const PantryView: React.FC = () => {
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
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* 1. Header Banner & Add Button */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Warehouse className="w-5 h-5 text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>{t('pantry.title')}</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {pantryItems.length}
              </Badge>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t('dialogs.households.currentHousehold')}: <strong>{household?.name}</strong>
            </span>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          size="sm"
          className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('pantry.addItem')}</span>
        </Button>
      </div>

      {/* 2. Search & Category Filter Chips */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pantry.searchPlaceholder')}
            className="h-9 pl-9 bg-card border-border text-xs rounded-xl"
          />
        </div>

        {resolvedCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer select-none border",
                selectedCategoryFilter === null
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    "h-7 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer select-none border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {getCategoryLabel(cat.name)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Items List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : pantryItems.length === 0 ? (
        <div className="py-16 px-4 bg-card/60 border border-dashed border-border rounded-2xl text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Warehouse className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('pantry.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('pantry.emptySubtitle')}
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="mt-4 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedAisles.map((group, index) => (
            <div key={group.categoryId ?? `pantry_group_${group.name}`} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider px-1 flex items-center justify-between">
                <span>
                  {group.sort_order !== 99999
                    ? `${index + 1}. ${getCategoryLabel(group.name)}`
                    : getCategoryLabel(group.name)}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {group.items.length}
                </span>
              </h4>

              <div className="flex flex-col gap-2">
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
                    <SwipeToDismiss
                      key={item.id}
                      onDismiss={() => {
                        setItemToDelete(item)
                        setIsDeleteModalOpen(true)
                      }}
                    >
                      <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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

                          {/* Recency description */}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            {item.last_purchased_at && (
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(item.last_purchased_at)}</span>
                              </span>
                            )}
                            {item.last_verified_at && (
                              <span className="flex items-center gap-1 font-mono text-emerald-400/90">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t('pantry.verifiedBadge')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper +/- */}
                        <div className="flex items-center bg-background border border-border rounded-lg p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title={t('common.decrease')}
                            aria-label={t('common.decrease')}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {editingId === item.id ? (
                            <div className="flex items-center gap-1 px-1">
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
                                className="w-14 h-7 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
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
                              className="font-mono text-xs px-2 py-0.5 font-bold min-w-[3.5rem] text-center text-primary hover:bg-muted rounded transition-colors cursor-text select-none"
                              title={t('common.edit')}
                            >
                              {formatQuantity(item.quantity, item.unit_type)}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleIncrease(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title={t('common.increase')}
                            aria-label={t('common.increase')}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </SwipeToDismiss>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pantry Item Sheet */}
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

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { productService } from '@/services/productService'
import type { Product } from '@/services/productService'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { CategoryManagerSheet } from '@/components/dialogs/CategoryManagerSheet'
import { CategoryManagerDialog } from '@/components/dialogs/CategoryManagerDialog'
import { useCategoryStore } from '@/store/useCategoryStore'
import { usePantryStore } from '@/store/usePantryStore'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { AddPantryItemDialog } from '@/components/dialogs/AddPantryItemDialog'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Plus,
  Flame,
  Globe,
  Home,
  Trash2,
  Edit2,
  Package,
  Scale,
  Layers,
  Warehouse
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const ProductsView: React.FC = () => {
  const { household } = useAuth()
  const { isDesktop } = useDeviceLayout()
  const { t, formatUnit, formatQuantity } = useTranslation()
  const { categoriesByHousehold, loadCategories } = useCategoryStore()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Household' | 'Global'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pantry Integration (Phase 4)
  const { pantryMapByProductId } = usePantryStore()
  const [pantryProduct, setPantryProduct] = useState<Product | null>(null)
  const [isAddPantryOpen, setIsAddPantryOpen] = useState(false)

  const householdKey = household?.id || 'global'
  const categories = useMemo(
    () => categoriesByHousehold[householdKey] || [],
    [categoriesByHousehold, householdKey]
  )

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [prodsData] = await Promise.all([
        productService.getProducts(household?.id),
        loadCategories(household?.id)
      ])
      setProducts(prodsData)
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }, [household?.id, loadCategories])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getCategoryLabel = React.useCallback((catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }, [t])

  // Category map: ID -> Category Name
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((cat) => map.set(cat.id, cat.name))
    return map
  }, [categories])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const isGlobal = prod.type === 'Global' || !prod.household_id
      const isHousehold = !isGlobal

      if (scopeFilter === 'Household' && !isHousehold) return false
      if (scopeFilter === 'Global' && !isGlobal) return false

      if (selectedCategoryId !== null && prod.category_id !== selectedCategoryId) {
        return false
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const rawCatName = prod.category_id ? categoryMap.get(prod.category_id) || '' : ''
        const translatedCatName = getCategoryLabel(rawCatName).toLowerCase()
        const matchesName = prod.name.toLowerCase().includes(query)
        const matchesCat = rawCatName.toLowerCase().includes(query) || translatedCatName.includes(query)
        if (!matchesName && !matchesCat) return false
      }

      return true
    })
  }, [products, scopeFilter, selectedCategoryId, searchQuery, categoryMap, getCategoryLabel])

  // Counts
  const totalCount = products.length
  const householdCount = products.filter((p) => p.type === 'Household' && p.household_id).length
  const globalCount = totalCount - householdCount

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod)
    setIsFormOpen(true)
  }

  const handleProductSaved = (savedProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === savedProduct.id)
      if (exists) {
        return prev.map((p) => (p.id === savedProduct.id ? savedProduct : p))
      }
      return [savedProduct, ...prev]
    })
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setIsDeleting(true)
    try {
      const success = await productService.deleteProduct(productToDelete.id)
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
        setProductToDelete(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Search and Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-input text-sm h-11 focus-visible:ring-primary rounded-xl"
          />
        </div>

        <Button
          onClick={handleOpenAdd}
          size="icon"
          className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title={t('products.addProduct')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Scope: All */}
        <button onClick={() => setScopeFilter('all')} className="shrink-0 cursor-pointer">
          <Badge
            variant={scopeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              "px-3 py-1.5 text-xs transition-all font-medium",
              scopeFilter === 'all'
                ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-border/80"
            )}
          >
            {t('common.all')} ({totalCount})
          </Badge>
        </button>

        {/* Scope: Household */}
        <button
          onClick={() => setScopeFilter(scopeFilter === 'Household' ? 'all' : 'Household')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Household'
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            )}
          >
            <Home className="w-3 h-3" />
            <span>{t('navigation.households')} ({householdCount})</span>
          </Badge>
        </button>

        {/* Scope: Global */}
        <button
          onClick={() => setScopeFilter(scopeFilter === 'Global' ? 'all' : 'Global')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Global'
                ? "bg-sky-500 text-white border-sky-400 font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3 h-3" />
            <span>{t('common.global')} ({globalCount})</span>
          </Badge>
        </button>

        {/* Category separator */}
        <span className="h-4 w-px bg-border shrink-0 mx-0.5" />

        {/* Manage Categories & Aisles Button */}
        {household?.id && (
          <button
            type="button"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="shrink-0 cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all select-none"
            title={t('categoryManager.manageAisles')}
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>{t('categoryManager.manageAisles')}</span>
          </button>
        )}

        {/* Category chips */}
        {categories
          .filter((cat) => !cat.is_hidden || selectedCategoryId === cat.id)
          .map((cat) => {
            const isSelected = selectedCategoryId === cat.id
            const displayName = cat.custom_name || getCategoryLabel(cat.name)
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className="shrink-0 cursor-pointer"
              >
                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    "px-2.5 py-1.5 text-xs transition-all",
                    isSelected
                      ? "bg-muted text-primary border-primary/50 font-bold"
                      : "text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                  )}
                >
                  {displayName}
                </Badge>
              </button>
            )
          })}
      </div>

      {/* Products list */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-card/50 rounded-2xl border border-border border-dashed p-6">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t('products.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {searchQuery || scopeFilter !== 'all' || selectedCategoryId !== null
              ? t('products.emptySubtitle')
              : t('products.emptySubtitle')}
          </p>
          {(searchQuery || scopeFilter !== 'all' || selectedCategoryId !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setScopeFilter('all')
                setSelectedCategoryId(null)
              }}
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredProducts.map((product) => {
            const isGlobal = product.type === 'Global' || !product.household_id
            const isHousehold = !isGlobal
            const rawCatName = product.category_id ? categoryMap.get(product.category_id) : null
            const categoryName = rawCatName ? getCategoryLabel(rawCatName) : null

            const kcal = product.kcal_per_100 ?? 0
            const protein = product.protein_per_100 ?? 0
            const carbs = product.carbs_per_100 ?? 0
            const fat = product.fat_per_100 ?? 0
            const hasMacros = kcal > 0 || protein > 0 || carbs > 0 || fat > 0

            const unitLabel = product.unit_type === 'pcs' ? formatQuantity(1, 'pcs') : `100 ${formatUnit(product.unit_type)}`

            const pantryItem = pantryMapByProductId[product.id]
            const isNonFood = !!(product.category_id && categories.find((c) => c.id === product.category_id)?.is_non_food)
            const freshness = pantryItem
              ? calculatePantryFreshness(
                  pantryItem.last_purchased_at,
                  isNonFood,
                  product.name,
                  formatQuantity(pantryItem.quantity, pantryItem.unit_type),
                  pantryItem.last_verified_at
                )
              : null

            return (
              <div
                key={product.id}
                className={cn(
                  "p-3.5 rounded-2xl bg-card border transition-all flex flex-col gap-2.5 shadow-sm group",
                  isHousehold
                    ? "border-border hover:border-primary/40 bg-card"
                    : "border-border hover:border-border/80"
                )}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {product.name}
                      </h4>

                      {/* Scope Badge */}
                      {isGlobal ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          <span>{t('common.global')}</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5" />
                          <span>{t('navigation.households')}</span>
                        </Badge>
                      )}
                    </div>

                    {/* Category & Unit & Pantry Stock */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      {categoryName && (
                        <span className="text-muted-foreground bg-background px-1.5 py-0.5 rounded-md border border-border">
                          {categoryName}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Scale className="w-3 h-3 text-muted-foreground" />
                        <span>{formatUnit(product.unit_type)}</span>
                      </span>

                      {/* Pantry stock badge */}
                      {pantryItem && freshness && (
                        <button
                          type="button"
                          onClick={() => {
                            setPantryProduct(product)
                            setIsAddPantryOpen(true)
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer shadow-xs",
                            freshness.badgeBgClass,
                            freshness.colorClass
                          )}
                          title={t(freshness.messageKey as any, freshness.translationParams as any)}
                        >
                          <Warehouse className="w-3 h-3 shrink-0" />
                          <span>{formatQuantity(pantryItem.quantity, pantryItem.unit_type)}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPantryProduct(product)
                        setIsAddPantryOpen(true)
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-colors cursor-pointer",
                        pantryItem
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title={pantryItem ? t('pantry.managePantry') : t('pantry.quickAdd')}
                      aria-label={pantryItem ? t('pantry.managePantry') : t('pantry.quickAdd')}
                    >
                      <Warehouse className="w-3.5 h-3.5" />
                    </button>

                    {isHousehold && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title={t('common.edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Macronutrient breakdown */}
                {hasMacros && (
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400 font-bold shrink-0">
                      <Flame className="w-3 h-3" />
                      <span>{Math.round(kcal)} {t('common.kcal')}</span>
                      <span className="text-[10px] font-normal text-amber-400/70">/{unitLabel}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-medium ml-auto">
                      <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-blue-400 font-bold">{t('common.proteinShort')}</span>
                        <span className="text-foreground font-semibold">{protein}g</span>
                      </span>
                      <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-amber-400 font-bold">{t('common.carbsShort')}</span>
                        <span className="text-foreground font-semibold">{carbs}g</span>
                      </span>
                      <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-rose-400 font-bold">{t('common.fatShort')}</span>
                        <span className="text-foreground font-semibold">{fat}g</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Product Form Sheet */}
      <ProductFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        productToEdit={editingProduct}
        onProductSaved={handleProductSaved}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!productToDelete}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null)
        }}
        title={t('dialogs.confirmDelete.title')}
        itemName={productToDelete?.name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Category Manager Modal (Desktop Dialog / Mobile Sheet) */}
      {household?.id && (
        isDesktop ? (
          <CategoryManagerDialog
            open={isCategoryManagerOpen}
            onOpenChange={setIsCategoryManagerOpen}
            householdId={household.id}
          />
        ) : (
          <CategoryManagerSheet
            open={isCategoryManagerOpen}
            onOpenChange={setIsCategoryManagerOpen}
            householdId={household.id}
          />
        )
      )}

      {/* Add / Edit Pantry Item Dialog */}
      <AddPantryItemDialog
        open={isAddPantryOpen}
        onOpenChange={setIsAddPantryOpen}
        initialProduct={pantryProduct}
      />
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  Search,
  Plus,
  Package,
  Home,
  Globe,
  Edit2,
  Trash2,
  Scale,
  Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopProductsView: React.FC = () => {
  const { household } = useAuth()
  const { t, formatUnit, formatQuantity } = useTranslation()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Global' | 'Household'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const loadData = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      productService.getProducts(household.id),
      productService.getCategories()
    ])
    setProducts(fetchedProducts)
    setCategories(fetchedCategories)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Custom event listener for global triggers
  useEffect(() => {
    const handleRefresh = () => loadData()
    window.addEventListener('smartshopping_refresh_products', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_products', handleRefresh)
  }, [loadData])

  const categoryMap = React.useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  // Filtered and sorted products
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesScope =
        scopeFilter === 'all'
          ? true
          : scopeFilter === 'Global'
          ? p.type === 'Global' || !p.household_id
          : p.type !== 'Global' && p.household_id

      const matchesCategory =
        selectedCategoryId === null ? true : p.category_id === selectedCategoryId

      return matchesSearch && matchesScope && matchesCategory
    })
  }, [products, searchQuery, scopeFilter, selectedCategoryId])

  const householdCount = products.filter((p) => p.type !== 'Global' && p.household_id).length
  const globalCount = products.filter((p) => p.type === 'Global' || !p.household_id).length
  const totalCount = products.length

  const handleOpenAdd = () => {
    setProductToEdit(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setProductToEdit(p)
    setIsFormOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    const success = await productService.deleteProduct(productToDelete.id)
    if (success) {
      setProductToDelete(null)
      loadData()
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Search & Actions Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background border-input focus-visible:ring-primary rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenAdd}
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {/* Scope: All */}
        <button onClick={() => setScopeFilter('all')} className="cursor-pointer">
          <Badge
            variant={scopeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs transition-all font-medium",
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
          className="cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Household'
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t('navigation.households')} ({householdCount})</span>
          </Badge>
        </button>

        {/* Scope: Global */}
        <button
          onClick={() => setScopeFilter(scopeFilter === 'Global' ? 'all' : 'Global')}
          className="cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Global'
                ? "bg-sky-500 text-white border-sky-400 font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('common.global')} ({globalCount})</span>
          </Badge>
        </button>

        {/* Separator if categories exist */}
        {categories.length > 0 && <span className="h-5 w-px bg-border mx-1" />}

        {/* Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
              className="cursor-pointer"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  "px-3 py-1.5 text-xs transition-all",
                  isSelected
                    ? "bg-card text-primary border-primary/50 font-bold"
                    : "text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                )}
              >
                {getCategoryLabel(cat.name)}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground mb-4">
            <Package className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-foreground">{t('products.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
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
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

            return (
              <div
                key={product.id}
                className={cn(
                  "p-4 rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-lg group",
                  isHousehold
                    ? "border-border hover:border-primary/50 hover:bg-muted/50"
                    : "border-border hover:border-border/80"
                )}
              >
                {/* Header: Name, Scope, Category, Edit Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
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
                      </div>
                    </div>

                    {/* Actions for Household products */}
                    {isHousehold && (
                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title={t('common.edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Category & Unit Meta */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    {categoryName ? (
                      <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border truncate max-w-[150px]">
                        {categoryName}
                      </span>
                    ) : <span />}

                    <span className="flex items-center gap-1 font-mono text-muted-foreground">
                      <Scale className="w-3 h-3 text-muted-foreground" />
                      <span>{formatUnit(product.unit_type)}</span>
                    </span>
                  </div>
                </div>

                {/* Macro summary footer */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  {hasMacros ? (
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground flex-wrap">
                      <span className="text-foreground font-semibold flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>{Math.round(kcal)} kcal</span>
                      </span>
                      <span className="text-border">|</span>
                      <span>P: <strong className="text-blue-400 font-semibold">{Math.round(protein)}g</strong></span>
                      <span>C: <strong className="text-amber-400 font-semibold">{Math.round(carbs)}g</strong></span>
                      <span>F: <strong className="text-rose-400 font-semibold">{Math.round(fat)}g</strong></span>
                      <span className="text-muted-foreground">/ {unitLabel}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {t('products.noNutritionalInfo')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Form Modal / Sheet */}
      <ProductFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        productToEdit={productToEdit}
        onProductSaved={loadData}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        itemName={productToDelete?.name}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

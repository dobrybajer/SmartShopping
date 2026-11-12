import React, { Suspense, lazy, useState } from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useProductsViewController } from '@/hooks/useProductsViewController'
import { ProductCatalogCard } from '@/components/products/ProductCatalogCard'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { AddPantryItemDialog } from '@/components/dialogs/AddPantryItemDialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Globe, Home, Package, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const CategoryManagerSheet = lazy(() =>
  import('@/components/dialogs/CategoryManagerSheet').then((m) => ({
    default: m.CategoryManagerSheet
  }))
)
const CategoryManagerDialog = lazy(() =>
  import('@/components/dialogs/CategoryManagerDialog').then((m) => ({
    default: m.CategoryManagerDialog
  }))
)

export const ProductsView: React.FC = () => {
  const { isDesktop } = useDeviceLayout()
  const { t } = useTranslation()
  const c = useProductsViewController()
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Search and Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={c.searchQuery}
            onChange={(e) => c.setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-input text-sm h-11 focus-visible:ring-primary rounded-xl"
          />
        </div>

        <Button
          onClick={c.handleOpenAdd}
          size="icon"
          className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title={t('products.addProduct')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => c.setScopeFilter('all')} className="shrink-0 cursor-pointer">
          <Badge
            variant={c.scopeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              'px-3 py-1.5 text-xs transition-all font-medium',
              c.scopeFilter === 'all'
                ? 'bg-foreground text-background border-foreground font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-border/80'
            )}
          >
            {t('common.all')} ({c.totalCount})
          </Badge>
        </button>

        <button
          onClick={() => c.setScopeFilter(c.scopeFilter === 'Household' ? 'all' : 'Household')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={c.scopeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              c.scopeFilter === 'Household'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
            )}
          >
            <Home className="w-3 h-3" />
            <span>
              {t('navigation.households')} ({c.householdCount})
            </span>
          </Badge>
        </button>

        <button
          onClick={() => c.setScopeFilter(c.scopeFilter === 'Global' ? 'all' : 'Global')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={c.scopeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              c.scopeFilter === 'Global'
                ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300'
            )}
          >
            <Globe className="w-3 h-3" />
            <span>
              {t('common.global')} ({c.globalCount})
            </span>
          </Badge>
        </button>

        <span className="h-4 w-px bg-border shrink-0 mx-0.5" />

        {c.household?.id && (
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

        {c.categories
          .filter((cat) => !cat.is_hidden || c.selectedCategoryId === cat.id)
          .map((cat) => {
            const isSelected = c.selectedCategoryId === cat.id
            const displayName = cat.custom_name || c.getCategoryLabel(cat.name)
            return (
              <button
                key={cat.id}
                onClick={() => c.setSelectedCategoryId(isSelected ? null : cat.id)}
                className="shrink-0 cursor-pointer"
              >
                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'px-2.5 py-1.5 text-xs transition-all',
                    isSelected
                      ? 'bg-muted text-primary border-primary/50 font-bold'
                      : 'text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
                  )}
                >
                  {displayName}
                </Badge>
              </button>
            )
          })}
      </div>

      {/* Products list */}
      {c.loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : c.filteredProducts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-card/50 rounded-2xl border border-border border-dashed p-6">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t('products.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('products.emptySubtitle')}
          </p>
          {(c.searchQuery || c.scopeFilter !== 'all' || c.selectedCategoryId !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={c.clearFilters}
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {c.filteredProducts.map((product) => {
            const rawCatName = product.category_id ? c.categoryMap.get(product.category_id) : null
            const isNonFood = !!(
              product.category_id &&
              c.categories.find((cat) => cat.id === product.category_id)?.is_non_food
            )
            return (
              <ProductCatalogCard
                key={product.id}
                product={product}
                variant="mobile"
                categoryName={rawCatName ? c.getCategoryLabel(rawCatName) : null}
                isNonFood={isNonFood}
                parentName={product.parent_id ? c.productMap.get(product.parent_id)?.name : null}
                childVariantCount={c.childCounts.get(product.id) || 0}
                pantryItem={c.pantryMapByProductId[product.id]}
                onOpenPantry={(p) => {
                  c.setPantryProduct(p)
                  c.setIsAddPantryOpen(true)
                }}
                onEdit={c.handleOpenEdit}
                onRequestDelete={c.requestDelete}
              />
            )
          })}
        </div>
      )}

      <ProductFormSheet
        open={c.isFormOpen}
        onOpenChange={c.setIsFormOpen}
        productToEdit={c.editingProduct}
        onProductSaved={c.handleProductSaved}
      />

      <ConfirmDeleteDialog
        open={!!c.productToDelete}
        onOpenChange={(open) => {
          if (!open) c.setProductToDelete(null)
        }}
        title={t('dialogs.confirmDelete.title')}
        itemName={c.productToDelete?.name}
        onConfirm={c.handleConfirmDelete}
        isDeleting={c.isDeleting}
      />

      {c.household?.id && isCategoryManagerOpen && (
        <Suspense fallback={null}>
          {isDesktop ? (
            <CategoryManagerDialog
              open={isCategoryManagerOpen}
              onOpenChange={setIsCategoryManagerOpen}
              householdId={c.household.id}
            />
          ) : (
            <CategoryManagerSheet
              open={isCategoryManagerOpen}
              onOpenChange={setIsCategoryManagerOpen}
              householdId={c.household.id}
            />
          )}
        </Suspense>
      )}

      <AddPantryItemDialog
        open={c.isAddPantryOpen}
        onOpenChange={c.setIsAddPantryOpen}
        initialProduct={c.pantryProduct}
      />
    </div>
  )
}

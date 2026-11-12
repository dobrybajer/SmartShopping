import React from 'react'
import { useTranslation } from '@/i18n'
import { useProductsViewController } from '@/hooks/useProductsViewController'
import { ProductCatalogCard } from '@/components/products/ProductCatalogCard'
import { AddPantryItemDialog } from '@/components/dialogs/AddPantryItemDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { Search, Plus, Package, Home, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopProductsView: React.FC = () => {
  const { t } = useTranslation()
  const c = useProductsViewController({
    listenGlobalRefresh: true,
    useServiceCategoriesFallback: true
  })

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Search & Actions Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('products.searchPlaceholder')}
            value={c.searchQuery}
            onChange={(e) => c.setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background border-input focus-visible:ring-primary rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={c.handleOpenAdd}
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('products.addProduct')}</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        <button onClick={() => c.setScopeFilter('all')} className="cursor-pointer">
          <Badge
            variant={c.scopeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs transition-all font-medium',
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
          className="cursor-pointer"
        >
          <Badge
            variant={c.scopeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              c.scopeFilter === 'Household'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>
              {t('navigation.households')} ({c.householdCount})
            </span>
          </Badge>
        </button>

        <button
          onClick={() => c.setScopeFilter(c.scopeFilter === 'Global' ? 'all' : 'Global')}
          className="cursor-pointer"
        >
          <Badge
            variant={c.scopeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              'px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium',
              c.scopeFilter === 'Global'
                ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-xs'
                : 'text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>
              {t('common.global')} ({c.globalCount})
            </span>
          </Badge>
        </button>

        {c.categories.length > 0 && <span className="h-5 w-px bg-border mx-1" />}

        {c.categories.map((cat) => {
          const isSelected = c.selectedCategoryId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => c.setSelectedCategoryId(isSelected ? null : cat.id)}
              className="cursor-pointer"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  'px-3 py-1.5 text-xs transition-all',
                  isSelected
                    ? 'bg-card text-primary border-primary/50 font-bold'
                    : 'text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
                )}
              >
                {c.getCategoryLabel(cat.name)}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      {c.loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : c.filteredProducts.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground mb-4">
            <Package className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-foreground">{t('products.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t('products.emptySubtitle')}
          </p>
          {(c.searchQuery || c.scopeFilter !== 'all' || c.selectedCategoryId !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={c.clearFilters}
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                variant="desktop"
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
        itemName={c.productToDelete?.name}
        onConfirm={c.handleConfirmDelete}
        isDeleting={c.isDeleting}
      />

      <AddPantryItemDialog
        open={c.isAddPantryOpen}
        onOpenChange={c.setIsAddPantryOpen}
        initialProduct={c.pantryProduct}
      />
    </div>
  )
}

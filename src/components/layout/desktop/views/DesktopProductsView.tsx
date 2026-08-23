import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
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
  Scale
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopProductsView: React.FC = () => {
  const { household } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Household' | 'Global'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prodsData, catsData] = await Promise.all([
        productService.getProducts(household?.id),
        productService.getCategories()
      ])
      setProducts(prodsData)
      setCategories(catsData)
    } catch (err) {
      console.error('Błąd podczas ładowania produktów:', err)
    } finally {
      setLoading(false)
    }
  }, [household?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleRefresh = () => {
      loadData()
    }
    window.addEventListener('smartshopping_refresh_products', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_products', handleRefresh)
  }, [loadData])

  // Category Map: ID -> Name
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((cat) => map.set(cat.id, cat.name))
    return map
  }, [categories])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const isGlobal = prod.type === 'Global' || !prod.household_id
      const isHousehold = !isGlobal

      // Scope filter
      if (scopeFilter === 'Household' && !isHousehold) return false
      if (scopeFilter === 'Global' && !isGlobal) return false

      // Category filter
      if (selectedCategoryId !== null && prod.category_id !== selectedCategoryId) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const catName = prod.category_id ? categoryMap.get(prod.category_id) || '' : ''
        const matchesName = prod.name.toLowerCase().includes(query)
        const matchesCat = catName.toLowerCase().includes(query)
        if (!matchesName && !matchesCat) return false
      }

      return true
    })
  }, [products, scopeFilter, selectedCategoryId, searchQuery, categoryMap])

  // Counters
  const totalCount = products.length
  const householdCount = products.filter((p) => p.type === 'Household' && p.household_id).length
  const globalCount = totalCount - householdCount

  // Handlers
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Search & Create Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj produktu lub kategorii..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-zinc-900/90 border-zinc-800 focus-visible:ring-emerald-500 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenAdd}
            className="h-11 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-lg shadow-emerald-950/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nowy Produkt</span>
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
                ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-bold shadow-xs"
                : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
            )}
          >
            Wszystkie ({totalCount})
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
              "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Household'
                ? "bg-emerald-500 text-black border-emerald-400 font-bold shadow-xs shadow-emerald-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Gospodarstwo ({householdCount})</span>
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
              "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Global'
                ? "bg-sky-500 text-black border-sky-400 font-bold shadow-xs shadow-sky-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Globalne ({globalCount})</span>
          </Badge>
        </button>

        {/* Category Separator */}
        {categories.length > 0 && <span className="h-5 w-px bg-zinc-800 mx-1" />}

        {/* Category Chips */}
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
                    ? "bg-zinc-800 text-emerald-400 border-emerald-500/50 font-bold"
                    : "text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-300"
                )}
              >
                {cat.name}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-zinc-500">Pobieranie bazy produktów...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-zinc-950/40 border border-zinc-900 border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-zinc-200">Brak produktów</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {searchQuery || scopeFilter !== 'all' || selectedCategoryId !== null
              ? 'Brak produktów pasujących do aktualnych filtrów.'
              : 'Kliknij przycisk Nowy Produkt, aby dodać pierwszy własny produkt do bazy.'}
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
              className="mt-4 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl"
            >
              Wyczyść filtry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isGlobal = product.type === 'Global' || !product.household_id
            const isHousehold = !isGlobal
            const categoryName = product.category_id ? categoryMap.get(product.category_id) : null

            const kcal = product.kcal_per_100 ?? 0
            const protein = product.protein_per_100 ?? 0
            const carbs = product.carbs_per_100 ?? 0
            const fat = product.fat_per_100 ?? 0
            const hasMacros = kcal > 0 || protein > 0 || carbs > 0 || fat > 0

            const unitLabel = product.unit_type === 'szt' ? '1 szt.' : `100 ${product.unit_type}`

            return (
              <div
                key={product.id}
                className={cn(
                  "p-4 rounded-2xl bg-zinc-950/80 border transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-lg group",
                  isHousehold
                    ? "border-zinc-900 hover:border-emerald-500/50 bg-gradient-to-br from-emerald-950/15 via-zinc-950 to-zinc-950"
                    : "border-zinc-900 hover:border-zinc-700"
                )}
              >
                {/* Header: Name, Scope, Category, Edit Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-sm text-zinc-100 group-hover:text-white transition-colors truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isGlobal ? (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                            >
                              <Globe className="w-2.5 h-2.5" />
                              <span>Globalny</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1"
                            >
                              <Home className="w-2.5 h-2.5" />
                              <span>Gospodarstwo</span>
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
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edytuj produkt"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Usuń produkt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Category & Unit Meta */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    {categoryName ? (
                      <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800/80 truncate max-w-[150px]">
                        {categoryName}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Inne</span>
                    )}

                    <span className="flex items-center gap-1 text-zinc-400 font-mono bg-zinc-900/60 px-1.5 py-0.5 rounded">
                      <Scale className="w-3 h-3 text-zinc-500" />
                      <span>{product.unit_type}</span>
                    </span>
                  </div>
                </div>

                {/* Macro & Calories section */}
                {hasMacros ? (
                  <div className="pt-2.5 border-t border-zinc-900 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-400 font-bold text-[11px]">
                        <Flame className="w-3 h-3" />
                        <span>{Math.round(kcal)} kcal</span>
                        <span className="text-[9px] font-normal text-amber-400/70">/{unitLabel}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-mono">
                        <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                          B:<strong className="text-blue-400 ml-0.5">{protein}g</strong>
                        </span>
                        <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                          W:<strong className="text-amber-400 ml-0.5">{carbs}g</strong>
                        </span>
                        <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                          T:<strong className="text-rose-400 ml-0.5">{fat}g</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-zinc-900 text-[11px] text-zinc-600 italic">
                    Brak danych o makroskładnikach
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
        title="Usuń produkt z gospodarstwa"
        itemName={productToDelete?.name}
        targetName="z bazy produktów Twojego gospodarstwa"
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}

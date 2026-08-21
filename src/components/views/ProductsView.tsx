import React, { useState, useEffect, useMemo } from 'react'
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

export const ProductsView: React.FC = () => {
  const { household } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Filtry i wyszukiwanie
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Household' | 'Global'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  // Dialogi
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
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
  }

  useEffect(() => {
    loadData()
  }, [household?.id])

  // Szybka mapa ID kategorii -> Nazwa kategorii
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((cat) => map.set(cat.id, cat.name))
    return map
  }, [categories])

  // Filtrowanie produktów
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const isGlobal = prod.type === 'Global' || !prod.household_id
      const isHousehold = !isGlobal

      // Filtr zasięgu
      if (scopeFilter === 'Household' && !isHousehold) return false
      if (scopeFilter === 'Global' && !isGlobal) return false

      // Filtr kategorii
      if (selectedCategoryId !== null && prod.category_id !== selectedCategoryId) {
        return false
      }

      // Filtr wyszukiwarki
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

  // Liczniki
  const totalCount = products.length
  const householdCount = products.filter((p) => p.type === 'Household' && p.household_id).length
  const globalCount = totalCount - householdCount

  // Obsługa dodawania / edycji
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

  // Obsługa usuwania
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
      {/* Pasek wyszukiwania i przycisk Dodaj */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj produktu lub kategorii..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-sm h-11 focus-visible:ring-emerald-500 rounded-xl"
          />
        </div>

        <Button
          onClick={handleOpenAdd}
          size="icon"
          className="h-11 w-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title="Dodaj produkt do gospodarstwa"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Pasek filtrów zasięgu oraz kategorii */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Zasięg: Wszystkie */}
        <button onClick={() => setScopeFilter('all')} className="shrink-0 cursor-pointer">
          <Badge
            variant={scopeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              "px-3 py-1.5 text-xs transition-all font-medium",
              scopeFilter === 'all'
                ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-bold shadow-xs"
                : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
            )}
          >
            Wszystkie ({totalCount})
          </Badge>
        </button>

        {/* Zasięg: Gospodarstwo */}
        <button
          onClick={() => setScopeFilter(scopeFilter === 'Household' ? 'all' : 'Household')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Household'
                ? "bg-emerald-500 text-black border-emerald-400 font-bold shadow-xs shadow-emerald-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
            )}
          >
            <Home className="w-3 h-3" />
            <span>Gospodarstwo ({householdCount})</span>
          </Badge>
        </button>

        {/* Zasięg: Globalne */}
        <button
          onClick={() => setScopeFilter(scopeFilter === 'Global' ? 'all' : 'Global')}
          className="shrink-0 cursor-pointer"
        >
          <Badge
            variant={scopeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              scopeFilter === 'Global'
                ? "bg-sky-500 text-black border-sky-400 font-bold shadow-xs shadow-sky-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3 h-3" />
            <span>Globalne ({globalCount})</span>
          </Badge>
        </button>

        {/* Separator kategorii */}
        {categories.length > 0 && <span className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />}

        {/* Kategorie chips */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id
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

      {/* Lista produktów */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-zinc-500">Pobieranie bazy produktów...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-zinc-950/50 rounded-2xl border border-zinc-900 border-dashed p-6">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Brak produktów</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            {searchQuery || scopeFilter !== 'all' || selectedCategoryId !== null
              ? 'Brak produktów pasujących do aktualnych filtrów.'
              : 'Kliknij przycisk +, aby dodać pierwszy własny produkt do bazy gospodarstwa.'}
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
              className="mt-4 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-lg"
            >
              Wyczyść filtry
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
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
                  "p-3.5 rounded-2xl bg-zinc-950 border transition-all flex flex-col gap-2.5 shadow-sm group",
                  isHousehold
                    ? "border-emerald-950/70 hover:border-emerald-500/40 bg-gradient-to-r from-emerald-950/10 to-transparent"
                    : "border-zinc-900 hover:border-zinc-800"
                )}
              >
                {/* Wiersz górny: Nazwa, Badges, Akcje */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-zinc-50 transition-colors truncate">
                        {product.name}
                      </h4>

                      {/* Zasięg Badge */}
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

                    {/* Kategoria & Jednostka */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      {categoryName && (
                        <span className="text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-800/80">
                          {categoryName}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-zinc-500">
                        <Scale className="w-3 h-3 text-zinc-500" />
                        <span>Jedn: {product.unit_type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Akcje po prawej (Tylko dla produktów gospodarstwa) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isHousehold && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edytuj produkt"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Usuń produkt z gospodarstwa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sekcja wartości odżywczych (Makro) jeśli produkt posiada parametry */}
                {hasMacros && (
                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2 flex-wrap text-xs">
                    {/* Kalorie */}
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400 font-bold shrink-0">
                      <Flame className="w-3 h-3" />
                      <span>{Math.round(kcal)} kcal</span>
                      <span className="text-[10px] font-normal text-amber-400/70">/{unitLabel}</span>
                    </div>

                    {/* Makro B / W / T */}
                    <div className="flex items-center gap-1.5 text-[11px] font-medium ml-auto">
                      <span className="text-zinc-500 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-blue-400 font-bold">B</span>
                        <span className="text-zinc-300 font-semibold">{protein}g</span>
                      </span>
                      <span className="text-zinc-500 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-amber-400 font-bold">W</span>
                        <span className="text-zinc-300 font-semibold">{carbs}g</span>
                      </span>
                      <span className="text-zinc-500 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="text-rose-400 font-bold">T</span>
                        <span className="text-zinc-300 font-semibold">{fat}g</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sheet dodawania / edycji produktu */}
      <ProductFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        productToEdit={editingProduct}
        onProductSaved={handleProductSaved}
      />

      {/* Dialog potwierdzenia usunięcia */}
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

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Database, Sparkles } from 'lucide-react'
import type { UnitEnum } from '@/types/supabase'

interface AddAdHocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddAdHocSheet: React.FC<AddAdHocSheetProps> = ({ open, onOpenChange }) => {
  const { household } = useAuth()
  const { addAdHocToDraft } = useShoppingStore()
  
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unitType, setUnitType] = useState<UnitEnum>('szt')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // Dialog potwierdzający dodanie nieistniejącego produktu do bazy danych
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)

  const loadData = React.useCallback(async () => {
    const cats = await productService.getCategories()
    setCategories(cats)

    if (household) {
      const prods = await productService.getProducts(household.id)
      setProducts(prods)
    }

    if (cats.length > 0 && !selectedCategoryId) {
      const chemCategory = cats.find((c) => c.name.toLowerCase().includes('chemia'))
      if (chemCategory) {
        setSelectedCategoryId(chemCategory.id)
      }
    }
  }, [household, selectedCategoryId])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  // Obsługa wyboru z listy autouzupełniania
  const handleSelectProduct = (product: Product) => {
    setName(product.name)
    setUnitType(product.unit_type)
    if (product.category_id) {
      setSelectedCategoryId(product.category_id)
    }
  }

  // Wstawienie pozycji do koszyka roboczego
  const commitToDraft = () => {
    const categoryObj = categories.find((c) => c.id === selectedCategoryId)

    addAdHocToDraft({
      name: name.trim(),
      unit_type: unitType,
      category_id: selectedCategoryId,
      category_name: categoryObj ? categoryObj.name : 'Inne',
      sort_order: categoryObj ? categoryObj.sort_order : 99,
      quantity: Number(quantity)
    })

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30)
      } catch {
        // Ignoruj
      }
    }

    onOpenChange(false)
    setName('')
    setQuantity(1)
  }

  // Sprawdzenie czy produkt istnieje w bazie przed dodaniem
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim() || quantity === '' || quantity <= 0) return

    const trimmed = name.trim().toLowerCase()
    const existingProduct = products.find((p) => p.name.toLowerCase() === trimmed)

    if (!existingProduct) {
      // Produkt nie istnieje w bazie - wyświetl pytanie
      setIsConfirmModalOpen(true)
    } else {
      // Produkt istnieje - od razu dodaj do koszyka
      commitToDraft()
    }
  }

  // Dodanie nowego produktu do bazy i do koszyka
  const handleSaveToDatabaseAndDraft = async () => {
    if (!household || !name.trim()) {
      commitToDraft()
      setIsConfirmModalOpen(false)
      return
    }

    setIsSavingToDb(true)
    const newProduct = await productService.createProduct({
      household_id: household.id,
      name: name.trim(),
      unit_type: unitType,
      category_id: selectedCategoryId || null,
      type: 'Household',
      is_ad_hoc: true
    })
    setIsSavingToDb(false)

    if (newProduct) {
      setProducts((prev) => [...prev, newProduct])
    }

    setIsConfirmModalOpen(false)
    commitToDraft()
  }

  // Dodanie tylko do koszyka jako jednorazowy Ad-hoc
  const handleAddOnlyToDraft = () => {
    setIsConfirmModalOpen(false)
    commitToDraft()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90dvh] flex flex-col p-5 sm:p-6">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <span>Dodaj Produkt Ad-hoc</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </SheetTitle>
            <SheetDescription>
              Wpisz nazwę lub wybierz produkt z bazy. Nowe produkty możesz automatycznie zapisać w bazie.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleFormSubmit}
            className="py-3 flex flex-col gap-3.5 text-xs overflow-y-auto flex-1 overscroll-contain"
          >
            {/* Nazwa produktu z podpowiedziami autouzupełniania */}
            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                Nazwa Produktu *
              </label>
              <ProductAutocomplete
                value={name}
                onChange={setName}
                products={products}
                categories={categories}
                onSelectProduct={handleSelectProduct}
                placeholder="np. Papier toaletowy 8-pak, Mleko 2%..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Ilość</label>
                <Input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 300)
                  }}
                  className="font-mono h-11 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Jednostka</label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as UnitEnum)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="szt">Sztuka (szt)</option>
                  <option value="g">Gram (g)</option>
                  <option value="ml">Mililitr (ml)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-300 block mb-1">
                Kategoria / Aleja w sklepie
              </label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) =>
                  setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Wybierz kategorię --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.sort_order}. {c.name}
                  </option>
                ))}
              </select>
            </div>
          </form>

          <SheetFooter className="pt-2 shrink-0">
            <Button
              type="button"
              onClick={() => handleFormSubmit()}
              disabled={!name.trim() || quantity === ''}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Wrzuć do Koszyka</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog pytający o dodanie nowego produktu do bazy danych */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 mx-auto sm:mx-0">
              <Database className="w-5 h-5" />
            </div>
            <DialogTitle>Nowy produkt</DialogTitle>
            <DialogDescription>
              Produktu <strong className="text-zinc-100">&quot;{name.trim()}&quot;</strong> nie ma jeszcze w bazie produktów.
              Czy chcesz zapisać go w bazie swojego gospodarstwa, aby był dostępny w podpowiedziach?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
            <Button
              onClick={handleSaveToDatabaseAndDraft}
              disabled={isSavingToDb}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {isSavingToDb ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Tak, dodaj do bazy i koszyka</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleAddOnlyToDraft}
              className="w-full h-10 border-zinc-800 text-zinc-300 hover:bg-zinc-900 rounded-xl"
            >
              Tylko do koszyka (Ad-hoc)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

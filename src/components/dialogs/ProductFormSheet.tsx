import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import type { UnitEnum } from '@/types/supabase'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Plus, Minus, Flame, Utensils, Tag, Scale, Package, Sparkles } from 'lucide-react'

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productToEdit?: Product | null
  onProductSaved?: (product: Product) => void
}

export const ProductFormSheet: React.FC<ProductFormSheetProps> = ({
  open,
  onOpenChange,
  productToEdit = null,
  onProductSaved
}) => {
  const { household } = useAuth()
  const isEditing = !!productToEdit

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [unitType, setUnitType] = useState<UnitEnum>('szt')
  const [isFood, setIsFood] = useState(true)

  // Makroskładniki
  const [kcal, setKcal] = useState<number | ''>(0)
  const [protein, setProtein] = useState<number | ''>(0)
  const [carbs, setCarbs] = useState<number | ''>(0)
  const [fat, setFat] = useState<number | ''>(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Załaduj kategorie
  useEffect(() => {
    if (open) {
      productService.getCategories().then((cats) => {
        setCategories(cats)
        if (!productToEdit && cats.length > 0) {
          setCategoryId((prev) => (prev === '' ? cats[0].id : prev))
        }
      })
    }
  }, [open, productToEdit])

  // Inicjalizacja pól w zależności od trybu (dodawanie/edycja)
  useEffect(() => {
    if (open) {
      setErrorMsg('')
      if (productToEdit) {
        setName(productToEdit.name)
        setCategoryId(productToEdit.category_id ?? '')
        setUnitType(productToEdit.unit_type)
        
        const hasMacro =
          (productToEdit.kcal_per_100 ?? 0) > 0 ||
          (productToEdit.protein_per_100 ?? 0) > 0 ||
          (productToEdit.carbs_per_100 ?? 0) > 0 ||
          (productToEdit.fat_per_100 ?? 0) > 0

        setIsFood(hasMacro || productToEdit.category_id !== 7) // kategoria 7 to chemia
        setKcal(productToEdit.kcal_per_100 ?? 0)
        setProtein(productToEdit.protein_per_100 ?? 0)
        setCarbs(productToEdit.carbs_per_100 ?? 0)
        setFat(productToEdit.fat_per_100 ?? 0)
      } else {
        setName('')
        setUnitType('szt')
        setIsFood(true)
        setKcal(0)
        setProtein(0)
        setCarbs(0)
        setFat(0)
      }
    }
  }, [open, productToEdit])

  const handleStepValue = (
    setter: React.Dispatch<React.SetStateAction<number | ''>>,
    current: number | '',
    step: number
  ) => {
    const val = typeof current === 'number' ? current : 0
    const nextVal = Math.max(0, Math.round((val + step) * 10) / 10)
    setter(nextVal)
  }

  const handleNumericInput = (
    setter: React.Dispatch<React.SetStateAction<number | ''>>,
    valueStr: string
  ) => {
    if (valueStr === '') {
      setter('')
      return
    }
    const num = parseFloat(valueStr)
    if (!isNaN(num) && num >= 0) {
      setter(num)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Podaj nazwę produktu.')
      return
    }
    if (!household) {
      setErrorMsg('Brak aktywnego gospodarstwa.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    const kcalVal = isFood ? (kcal === '' ? 0 : Number(kcal)) : 0
    const proteinVal = isFood ? (protein === '' ? 0 : Number(protein)) : 0
    const carbsVal = isFood ? (carbs === '' ? 0 : Number(carbs)) : 0
    const fatVal = isFood ? (fat === '' ? 0 : Number(fat)) : 0
    const catVal = categoryId === '' ? null : Number(categoryId)

    try {
      if (isEditing && productToEdit) {
        const updated = await productService.updateProduct(productToEdit.id, {
          name: name.trim(),
          category_id: catVal,
          unit_type: unitType,
          kcal_per_100: kcalVal,
          protein_per_100: proteinVal,
          carbs_per_100: carbsVal,
          fat_per_100: fatVal
        })

        if (updated) {
          onProductSaved?.(updated)
          onOpenChange(false)
        } else {
          setErrorMsg('Nie udało się zapisać zmian produktu.')
        }
      } else {
        const created = await productService.createProduct({
          name: name.trim(),
          category_id: catVal,
          unit_type: unitType,
          kcal_per_100: kcalVal,
          protein_per_100: proteinVal,
          carbs_per_100: carbsVal,
          fat_per_100: fatVal,
          household_id: household.id,
          type: 'Household',
          is_ad_hoc: false
        })

        if (created) {
          onProductSaved?.(created)
          onOpenChange(false)
        } else {
          setErrorMsg('Nie udało się dodać produktu.')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Wystąpił nieoczekiwany błąd.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitSuffix = unitType === 'szt' ? '1 szt.' : `100 ${unitType}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-[85vh] bg-zinc-950 border-t border-zinc-800 text-white rounded-t-3xl flex flex-col p-0 overflow-hidden"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-zinc-100">
                {isEditing ? 'Edytuj produkt gospodarstwa' : 'Dodaj produkt do gospodarstwa'}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-400">
                {isEditing
                  ? 'Zmień parametry i wartości odżywcze produktu'
                  : 'Produkt będzie dostępny dla wszystkich domowników'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Nazwa Produktu */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nazwa produktu *</span>
              </label>
              <Input
                placeholder="np. Skyr naturalny, Mleko migdałowe..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 text-sm h-11"
                autoFocus={!isEditing}
              />
            </div>

            {/* Kategoria i Jednostka w 2 kolumnach */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kategoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-sky-400" />
                  <span>Kategoria</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-11 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="">Wybierz kategorię...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-zinc-900 text-zinc-200">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jednostka */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Domyślna jednostka</span>
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as UnitEnum)}
                  className="w-full h-11 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="szt">szt (sztuki)</option>
                  <option value="g">g (gramy)</option>
                  <option value="ml">ml (mililitry)</option>
                </select>
              </div>
            </div>

            {/* Checkbox: Jedzenie? */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100">Artykuł spożywczy (Jedzenie)?</div>
                  <div className="text-[11px] text-zinc-400">
                    Zaznacz, aby wprowadzić kalorie i makroskładniki
                  </div>
                </div>
              </div>

              <Checkbox
                id="isFood"
                checked={isFood}
                onCheckedChange={(checked) => setIsFood(!!checked)}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-5 w-5 rounded-md"
              />
            </div>

            {/* Pola makro jeśli isFood = true */}
            {isFood && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Wartości odżywcze na {unitSuffix}
                  </span>
                  <span className="text-[10px] text-zinc-500">Krok: kcal ±100, B/W/T ±1</span>
                </div>

                {/* Kcal (krok 100) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Kalorie
                    </span>
                    <span className="text-[10px] text-zinc-500">kcal</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setKcal, kcal, -100)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={kcal}
                      onChange={(e) => handleNumericInput(setKcal, e.target.value)}
                      className="h-9 bg-zinc-950 border-zinc-800 text-center font-bold text-emerald-400 text-sm focus-visible:ring-emerald-500 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setKcal, kcal, 100)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Białko (krok 1) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-blue-400">Białko</span>
                    <span className="text-[10px] text-zinc-500 ml-1">g</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setProtein, protein, -1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={protein}
                      onChange={(e) => handleNumericInput(setProtein, e.target.value)}
                      className="h-9 bg-zinc-950 border-zinc-800 text-center font-semibold text-blue-300 text-sm focus-visible:ring-emerald-500 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setProtein, protein, 1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Węglowodany (krok 1) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-amber-300">Węglowodany</span>
                    <span className="text-[10px] text-zinc-500 ml-1">g</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setCarbs, carbs, -1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={carbs}
                      onChange={(e) => handleNumericInput(setCarbs, e.target.value)}
                      className="h-9 bg-zinc-950 border-zinc-800 text-center font-semibold text-amber-200 text-sm focus-visible:ring-emerald-500 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setCarbs, carbs, 1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Tłuszcze (krok 1) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-rose-400">Tłuszcze</span>
                    <span className="text-[10px] text-zinc-500 ml-1">g</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setFat, fat, -1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={fat}
                      onChange={(e) => handleNumericInput(setFat, e.target.value)}
                      className="h-9 bg-zinc-950 border-zinc-800 text-center font-semibold text-rose-300 text-sm focus-visible:ring-emerald-500 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStepValue(setFat, fat, 1)}
                      className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 shrink-0 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="p-4 border-t border-zinc-900 bg-zinc-950/90 flex flex-row gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl h-11 cursor-pointer"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl h-11 flex items-center justify-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Zapisz zmiany' : 'Dodaj produkt'}</span>
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

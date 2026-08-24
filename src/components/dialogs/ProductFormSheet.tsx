import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
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
  const { t, formatUnit, formatQuantity } = useTranslation()
  const isEditing = !!productToEdit

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [unitType, setUnitType] = useState<UnitEnum>('pcs')
  const [isFood, setIsFood] = useState(true)

  // Macronutrients
  const [kcal, setKcal] = useState<number | ''>(0)
  const [protein, setProtein] = useState<number | ''>(0)
  const [carbs, setCarbs] = useState<number | ''>(0)
  const [fat, setFat] = useState<number | ''>(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

  useEffect(() => {
    if (open) {
      setErrorMsg('')
      if (productToEdit) {
        setName(productToEdit.name)
        setCategoryId(productToEdit.category_id ?? '')
        setUnitType(productToEdit.unit_type as UnitEnum)
        
        const hasMacro =
          (productToEdit.kcal_per_100 ?? 0) > 0 ||
          (productToEdit.protein_per_100 ?? 0) > 0 ||
          (productToEdit.carbs_per_100 ?? 0) > 0 ||
          (productToEdit.fat_per_100 ?? 0) > 0

        setIsFood(hasMacro || productToEdit.category_id !== 7)
        setKcal(productToEdit.kcal_per_100 ?? 0)
        setProtein(productToEdit.protein_per_100 ?? 0)
        setCarbs(productToEdit.carbs_per_100 ?? 0)
        setFat(productToEdit.fat_per_100 ?? 0)
      } else {
        setName('')
        setUnitType('pcs')
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
    value: string
  ) => {
    if (value === '') {
      setter('')
      return
    }
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed)
    }
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg(t('dialogs.productForm.nameLabel'))
      return
    }
    if (!household) {
      setErrorMsg(t('toasts.errorOccurred'))
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const kcalVal = isFood && typeof kcal === 'number' ? kcal : 0
      const proteinVal = isFood && typeof protein === 'number' ? protein : 0
      const carbsVal = isFood && typeof carbs === 'number' ? carbs : 0
      const fatVal = isFood && typeof fat === 'number' ? fat : 0
      const catVal = typeof categoryId === 'number' ? categoryId : null

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
          setErrorMsg(t('toasts.errorOccurred'))
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
          setErrorMsg(t('toasts.errorOccurred'))
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(t('toasts.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitSuffix = unitType === 'pcs' ? formatQuantity(1, 'pcs') : `100 ${formatUnit(unitType)}`

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
                {isEditing ? t('dialogs.productForm.editTitle') : t('dialogs.productForm.addTitle')}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-400">
                {isEditing
                  ? t('products.subtitle')
                  : t('products.householdProduct')}
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

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('dialogs.productForm.nameLabel')} *</span>
              </label>
              <Input
                placeholder={t('dialogs.productForm.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 text-sm h-11"
                autoFocus={!isEditing}
              />
            </div>

            {/* Category and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('dialogs.productForm.categoryLabel')}</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-11 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="">{t('common.select')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-zinc-900 text-zinc-200">
                      {getCategoryLabel(cat.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('dialogs.productForm.unitLabel')}</span>
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as UnitEnum)}
                  className="w-full h-11 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  <option value="pcs">pcs ({formatUnit('pcs')})</option>
                  <option value="g">g ({formatUnit('g')})</option>
                  <option value="ml">ml ({formatUnit('ml')})</option>
                </select>
              </div>
            </div>

            {/* Is food? */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100">{t('products.macrosPer100')}</div>
                  <div className="text-[11px] text-zinc-400">
                    {t('cookbook.macros')}
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

            {/* Macro inputs */}
            {isFood && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    {t('products.macrosPer100')} ({unitSuffix})
                  </span>
                  <span className="text-[10px] text-zinc-500">±100 kcal, ±1 P/C/F</span>
                </div>

                {/* Kcal */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      {t('dialogs.productForm.kcalLabel')}
                    </span>
                    <span className="text-[10px] text-zinc-500">{t('common.kcal')}</span>
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

                {/* Protein */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-blue-400">{t('dialogs.productForm.proteinLabel')}</span>
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

                {/* Carbs */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-amber-300">{t('dialogs.productForm.carbsLabel')}</span>
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

                {/* Fat */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-28">
                    <span className="text-xs font-semibold text-rose-400">{t('dialogs.productForm.fatLabel')}</span>
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
              {t('common.cancel')}
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
                  <span>{isEditing ? t('dialogs.productForm.submitEdit') : t('dialogs.productForm.submitAdd')}</span>
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

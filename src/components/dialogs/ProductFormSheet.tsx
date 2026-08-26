import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import type { UnitEnum } from '@/types/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
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
  const { isDesktop } = useDeviceLayout()
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

  // Load product categories
  useEffect(() => {
    async function loadCategories() {
      const data = await productService.getCategories(household?.id)
      setCategories(data)
    }
    loadCategories()
  }, [household?.id])

  // Sync form state when productToEdit changes or sheet opens
  useEffect(() => {
    if (open) {
      if (productToEdit) {
        setName(productToEdit.name)
        setCategoryId(productToEdit.category_id || '')
        setUnitType(productToEdit.unit_type)
        const hasMacros = (productToEdit.kcal_per_100 ?? 0) > 0 || (productToEdit.protein_per_100 ?? 0) > 0
        setIsFood(hasMacros)
        setKcal(productToEdit.kcal_per_100 ?? 0)
        setProtein(productToEdit.protein_per_100 ?? 0)
        setCarbs(productToEdit.carbs_per_100 ?? 0)
        setFat(productToEdit.fat_per_100 ?? 0)
      } else {
        setName('')
        setCategoryId('')
        setUnitType('pcs')
        setIsFood(true)
        setKcal(0)
        setProtein(0)
        setCarbs(0)
        setFat(0)
      }
      setErrorMsg('')
    }
  }, [open, productToEdit])

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  const handleStepValue = (
    setter: React.Dispatch<React.SetStateAction<number | ''>>,
    curr: number | '',
    step: number,
    min = 0
  ) => {
    const val = typeof curr === 'number' ? curr : 0
    const nextVal = Math.max(min, Math.round((val + step) * 10) / 10)
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
    const parsed = parseFloat(valueStr)
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg(t('dialogs.productForm.nameLabel'))
      return
    }

    if (!isEditing && !household) {
      setErrorMsg(t('dialogs.households.switchHousehold'))
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      if (isEditing && productToEdit) {
        const updated = await productService.updateProduct(productToEdit.id, {
          name: name.trim(),
          category_id: categoryId === '' ? null : Number(categoryId),
          unit_type: unitType,
          kcal_per_100: isFood ? (typeof kcal === 'number' ? kcal : 0) : null,
          protein_per_100: isFood ? (typeof protein === 'number' ? protein : 0) : null,
          carbs_per_100: isFood ? (typeof carbs === 'number' ? carbs : 0) : null,
          fat_per_100: isFood ? (typeof fat === 'number' ? fat : 0) : null
        })

        if (updated) {
          onProductSaved?.(updated)
          onOpenChange(false)
        } else {
          setErrorMsg(t('toasts.errorOccurred'))
        }
      } else if (household) {
        const created = await productService.createProduct({
          household_id: household.id,
          name: name.trim(),
          category_id: categoryId === '' ? undefined : Number(categoryId),
          unit_type: unitType,
          kcal_per_100: isFood ? (typeof kcal === 'number' ? kcal : 0) : undefined,
          protein_per_100: isFood ? (typeof protein === 'number' ? protein : 0) : undefined,
          carbs_per_100: isFood ? (typeof carbs === 'number' ? carbs : 0) : undefined,
          fat_per_100: isFood ? (typeof fat === 'number' ? fat : 0) : undefined
        })

        if (created) {
          onProductSaved?.(created)
          onOpenChange(false)
        } else {
          setErrorMsg(t('toasts.errorOccurred'))
        }
      }
    } catch {
      setErrorMsg(t('toasts.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitSuffix = unitType === 'pcs' ? formatQuantity(1, 'pcs') : `100 ${formatUnit(unitType)}`

  const headerContent = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Package className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
          {isEditing ? t('dialogs.productForm.editTitle') : t('dialogs.productForm.addTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEditing ? t('products.subtitle') : t('products.householdProduct')}
        </p>
      </div>
    </div>
  )

  const formBody = (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        {/* Product Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span>{t('dialogs.productForm.nameLabel')} *</span>
          </label>
          <Input
            placeholder={t('dialogs.productForm.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background border-input focus-visible:ring-primary text-sm h-11"
            autoFocus={!isEditing}
          />
        </div>

        {/* Category and Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('dialogs.productForm.categoryLabel')}</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-11 px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="" className="bg-card text-foreground">{t('common.select')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-card text-foreground">
                  {getCategoryLabel(cat.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('dialogs.productForm.unitLabel')}</span>
            </label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as UnitEnum)}
              className="w-full h-11 px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="pcs" className="bg-card text-foreground">pcs ({formatUnit('pcs')})</option>
              <option value="g" className="bg-card text-foreground">g ({formatUnit('g')})</option>
              <option value="ml" className="bg-card text-foreground">ml ({formatUnit('ml')})</option>
            </select>
          </div>
        </div>

        {/* Is food? */}
        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{t('products.macrosPer100')}</div>
              <div className="text-[11px] text-muted-foreground">
                {t('cookbook.macros')}
              </div>
            </div>
          </div>

          <Checkbox
            id="isFood"
            checked={isFood}
            onCheckedChange={(checked) => setIsFood(!!checked)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5 rounded-md"
          />
        </div>

        {/* Macro inputs */}
        {isFood && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-background border border-border animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t('products.macrosPer100')} ({unitSuffix})
              </span>
              <span className="text-[10px] text-muted-foreground">±100 kcal, ±1 P/C/F</span>
            </div>

            {/* Kcal */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-28">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  {t('dialogs.productForm.kcalLabel')}
                </span>
                <span className="text-[10px] text-muted-foreground">{t('common.kcal')}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setKcal, kcal, -100)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
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
                  className="h-9 bg-background border-input text-center font-bold text-primary text-sm focus-visible:ring-primary rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setKcal, kcal, 100)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Protein */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-28">
                <span className="text-xs font-semibold text-blue-400">{t('dialogs.productForm.proteinLabel')}</span>
                <span className="text-[10px] text-muted-foreground ml-1">g</span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setProtein, protein, -1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
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
                  className="h-9 bg-background border-input text-center font-semibold text-blue-400 text-sm focus-visible:ring-primary rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setProtein, protein, 1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Carbs */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-28">
                <span className="text-xs font-semibold text-amber-400">{t('dialogs.productForm.carbsLabel')}</span>
                <span className="text-[10px] text-muted-foreground ml-1">g</span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setCarbs, carbs, -1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
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
                  className="h-9 bg-background border-input text-center font-semibold text-amber-400 text-sm focus-visible:ring-primary rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setCarbs, carbs, 1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Fat */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-28">
                <span className="text-xs font-semibold text-rose-400">{t('dialogs.productForm.fatLabel')}</span>
                <span className="text-[10px] text-muted-foreground ml-1">g</span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setFat, fat, -1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
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
                  className="h-9 bg-background border-input text-center font-semibold text-rose-400 text-sm focus-visible:ring-primary rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStepValue(setFat, fat, 1)}
                  className="h-9 w-9 bg-card border-border hover:bg-muted text-foreground shrink-0 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-card/90 flex flex-row gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="flex-1 border-border bg-card hover:bg-muted text-foreground rounded-xl h-11 cursor-pointer"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 flex items-center justify-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? t('dialogs.productForm.submitEdit') : t('dialogs.productForm.submitAdd')}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-lg w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
            <DialogTitle className="sr-only">
              {isEditing ? t('dialogs.productForm.editTitle') : t('dialogs.productForm.addTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing ? t('products.subtitle') : t('products.householdProduct')}
            </DialogDescription>
            {headerContent}
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-[85vh] bg-card border-t border-border text-foreground rounded-t-3xl flex flex-col p-0 overflow-hidden"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
          <SheetTitle className="sr-only">
            {isEditing ? t('dialogs.productForm.editTitle') : t('dialogs.productForm.addTitle')}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing ? t('products.subtitle') : t('products.householdProduct')}
          </SheetDescription>
          {headerContent}
        </SheetHeader>
        {formBody}
      </SheetContent>
    </Sheet>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePantryStore } from '@/store/usePantryStore'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { productService, type Product, type ProductCategory } from '@/services/productService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { toast } from '@/store/useToastStore'
import { Warehouse, Plus, Minus, Layers, AlertCircle } from 'lucide-react'
import type { UnitEnum } from '@/types/supabase'
import { cn, getNextQuantity } from '@/lib/utils'

export interface AddPantryItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const AddPantryItemDialog: React.FC<AddPantryItemDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { household } = useAuth()
  const { isDesktop } = useDeviceLayout()
  const {
    pantryMapByProductId,
    pantryMapByAdHocName,
    addOrIncrementItem
  } = usePantryStore()
  const { t, formatUnit, formatQuantity } = useTranslation()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unitType, setUnitType] = useState<UnitEnum>('pcs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)
  const [mergeMode, setMergeMode] = useState<'increment' | 'set'>('increment')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const loadData = useCallback(async () => {
    if (!household?.id) return
    const [cats, prods] = await Promise.all([
      productService.getCategories(household.id),
      productService.getProducts(household.id)
    ])
    setCategories(cats)
    setProducts(prods as any)
  }, [household])

  useEffect(() => {
    if (open) {
      loadData()
      setName('')
      setQuantity(1)
      setUnitType('pcs')
      setSelectedCategoryId(undefined)
      setSelectedProductId(undefined)
      setMergeMode('increment')
    }
  }, [open, loadData])

  // Check if item is already in pantry
  const existingPantryItem =
    (selectedProductId ? pantryMapByProductId[selectedProductId] : null) ||
    (name.trim() ? pantryMapByAdHocName[name.trim().toLowerCase()] : null)

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id)
    setName(product.name)
    setUnitType(product.unit_type as UnitEnum)
    if (product.category_id) {
      setSelectedCategoryId(product.category_id)
    }
  }

  const handleIncrease = () => {
    const current = typeof quantity === 'number' ? quantity : 1
    setQuantity(getNextQuantity(current, unitType, 'increase'))
  }

  const handleDecrease = () => {
    const current = typeof quantity === 'number' ? quantity : 1
    const next = getNextQuantity(current, unitType, 'decrease')
    if (next > 0) {
      setQuantity(next)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!household?.id || !name.trim() || quantity === '' || quantity <= 0) return

    setIsSubmitting(true)
    try {
      let resolvedProdId = selectedProductId
      let resolvedCatId = selectedCategoryId

      // Catalog integrity: if not selected from catalog, see if product exists or create it
      if (!resolvedProdId) {
        const match = products.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        )
        if (match) {
          resolvedProdId = match.id
          resolvedCatId = match.category_id || resolvedCatId
        } else {
          // Create product in catalog
          const newProd = await productService.createProduct({
            household_id: household.id,
            name: name.trim(),
            unit_type: unitType,
            category_id: resolvedCatId || null,
            type: 'Household',
            is_ad_hoc: false
          })
          if (newProd) {
            resolvedProdId = newProd.id
            resolvedCatId = newProd.category_id || resolvedCatId
          }
        }
      }

      const nowIso = new Date().toISOString()

      const success = await addOrIncrementItem(
        {
          household_id: household.id,
          product_id: resolvedProdId || null,
          ad_hoc_name: resolvedProdId ? null : name.trim(),
          category_id: resolvedCatId || null,
          quantity: Number(quantity),
          unit_type: unitType,
          last_purchased_at: nowIso,
          last_verified_at: nowIso
        },
        mergeMode
      )

      if (success) {
        toast.success(
          mergeMode === 'increment' && existingPantryItem
            ? t('pantry.addDialog.mergeOptionIncrease', { quantity: formatQuantity(Number(quantity), unitType) })
            : `${t('pantry.inStock')}: ${name}`
        )
        onSuccess?.()
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 1. Product Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>{t('pantry.addDialog.selectProduct')}</span>
          {selectedCategoryId && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {getCategoryLabel(
                categories.find((c) => c.id === selectedCategoryId)?.name || 'other'
              )}
            </span>
          )}
        </label>
        <ProductAutocomplete
          value={name}
          onChange={(val) => {
            setName(val)
            setSelectedProductId(undefined)
          }}
          onSelectProduct={handleSelectProduct}
          products={products}
          placeholder={t('pantry.searchPlaceholder')}
        />
      </div>

      {/* 2. Duplicate Detection Banner & Merge Choice */}
      {existingPantryItem && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t('pantry.addDialog.alreadyInPantry', {
                quantity: formatQuantity(existingPantryItem.quantity, existingPantryItem.unit_type)
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMergeMode('increment')}
              className={cn(
                "p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer",
                mergeMode === 'increment'
                  ? "bg-amber-500 text-black border-amber-500 font-bold shadow-xs"
                  : "bg-background/80 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span className="truncate">
                  {t('pantry.addDialog.mergeOptionIncrease', {
                    quantity: formatQuantity(Number(quantity) || 0, unitType)
                  })}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMergeMode('set')}
              className={cn(
                "p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer",
                mergeMode === 'set'
                  ? "bg-amber-500 text-black border-amber-500 font-bold shadow-xs"
                  : "bg-background/80 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate">
                  {t('pantry.addDialog.mergeOptionSet', {
                    quantity: formatQuantity(Number(quantity) || 0, unitType)
                  })}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 3. Quantity Stepper & Unit Selector */}
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">
            {t('pantry.addDialog.quantity')}
          </label>
          <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner h-11">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
              title={t('common.decrease')}
              aria-label={t('common.decrease')}
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => {
                const val = e.target.value
                setQuantity(val === '' ? '' : parseFloat(val))
              }}
              className="w-full text-center bg-transparent font-mono text-sm font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <button
              type="button"
              onClick={handleIncrease}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
              title={t('common.increase')}
              aria-label={t('common.increase')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">
            {t('pantry.addDialog.unit')}
          </label>
          <div className="grid grid-cols-3 gap-1 bg-background border border-border rounded-xl p-1 h-11 items-center">
            {(['pcs', 'g', 'ml'] as UnitEnum[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitType(u)}
                className={cn(
                  "h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  unitType === u
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {formatUnit(u)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Category Selector (Optional refinement) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">
          {t('products.category')}
        </label>
        <select
          value={selectedCategoryId ?? ''}
          onChange={(e) => {
            const val = e.target.value
            setSelectedCategoryId(val ? Number(val) : undefined)
          }}
          className="h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium cursor-pointer outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('common.selectCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {getCategoryLabel(c.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Submit CTA */}
      <Button
        type="submit"
        disabled={!name.trim() || quantity === '' || quantity <= 0 || isSubmitting}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Warehouse className="w-4 h-4" />
            <span>{t('pantry.addDialog.submit')}</span>
          </>
        )}
      </Button>
    </form>
  )

  const headerDetails = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Warehouse className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground leading-tight">
          {t('pantry.addDialog.title')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('pantry.addDialog.subtitle')}
        </p>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle asChild>{headerDetails}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">{formContent}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border p-6 shadow-2xl">
        <SheetHeader className="pb-3 border-b border-border text-left">
          <SheetTitle asChild>{headerDetails}</SheetTitle>
        </SheetHeader>
        <div className="pt-3">{formContent}</div>
      </SheetContent>
    </Sheet>
  )
}

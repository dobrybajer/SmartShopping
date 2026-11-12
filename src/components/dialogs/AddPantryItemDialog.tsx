import React from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useAddPantryItemForm } from '@/hooks/useAddPantryItemForm'
import type { Product } from '@/services/productService'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { Warehouse, Plus, Minus, Layers, AlertCircle } from 'lucide-react'
import type { UnitEnum } from '@/types/supabase'
import { cn } from '@/lib/utils'

export interface AddPantryItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialProduct?: Product | null
}

export const AddPantryItemDialog: React.FC<AddPantryItemDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialProduct
}) => {
  const { isDesktop } = useDeviceLayout()
  const { t, formatUnit, formatQuantity } = useTranslation()
  const form = useAddPantryItemForm({ open, onOpenChange, onSuccess, initialProduct })

  const formContent = (
    <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>{t('pantry.addDialog.selectProduct')}</span>
          {form.selectedCategoryId && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {form.getCategoryLabel(
                form.categories.find((c) => c.id === form.selectedCategoryId)?.name || 'other'
              )}
            </span>
          )}
        </label>
        <ProductAutocomplete
          value={form.name}
          onChange={(val) => {
            form.setName(val)
            form.setSelectedProductId(undefined)
          }}
          onSelectProduct={form.handleSelectProduct}
          products={form.products}
          placeholder={t('pantry.searchPlaceholder')}
        />
      </div>

      {form.existingPantryItem && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t('pantry.addDialog.alreadyInPantry', {
                quantity: formatQuantity(
                  form.existingPantryItem.quantity,
                  form.existingPantryItem.unit_type
                )
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => form.setMergeMode('increment')}
              className={cn(
                'p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer',
                form.mergeMode === 'increment'
                  ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-xs'
                  : 'bg-background/80 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span className="truncate">
                  {t('pantry.addDialog.mergeOptionIncrease', {
                    quantity: formatQuantity(Number(form.quantity) || 0, form.unitType)
                  })}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => form.setMergeMode('set')}
              className={cn(
                'p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer',
                form.mergeMode === 'set'
                  ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-xs'
                  : 'bg-background/80 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate">
                  {t('pantry.addDialog.mergeOptionSet', {
                    quantity: formatQuantity(Number(form.quantity) || 0, form.unitType)
                  })}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">
            {t('pantry.addDialog.quantity')}
          </label>
          <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner h-11">
            <button
              type="button"
              onClick={form.handleDecrease}
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
              value={form.quantity}
              onChange={(e) => {
                const val = e.target.value
                form.setQuantity(val === '' ? '' : parseFloat(val))
              }}
              className="w-full text-center bg-transparent font-mono text-sm font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <button
              type="button"
              onClick={form.handleIncrease}
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
                onClick={() => form.setUnitType(u)}
                className={cn(
                  'h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  form.unitType === u
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {formatUnit(u)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">{t('products.category')}</label>
        <select
          value={form.selectedCategoryId ?? ''}
          onChange={(e) => {
            const val = e.target.value
            form.setSelectedCategoryId(val ? Number(val) : undefined)
          }}
          className="h-10 px-3 rounded-xl bg-background border border-border text-foreground text-xs font-medium cursor-pointer outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('common.selectCategory')}</option>
          {form.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {form.getCategoryLabel(c.name)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pantry-expiration-date" className="text-xs font-semibold text-foreground">
          {t('pantry.expiry.label')}
        </label>
        <input
          id="pantry-expiration-date"
          type="date"
          value={form.expirationDate}
          onChange={(e) => form.setExpirationDate(e.target.value)}
          className="h-10 px-3 rounded-xl bg-background border border-border text-foreground font-mono text-xs cursor-pointer outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <Button
        type="submit"
        disabled={
          !form.name.trim() || form.quantity === '' || form.quantity <= 0 || form.isSubmitting
        }
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg cursor-pointer disabled:opacity-50"
      >
        {form.isSubmitting ? (
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
        <p className="text-xs text-muted-foreground">{t('pantry.addDialog.subtitle')}</p>
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

import React from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useProductForm } from '@/hooks/useProductForm'
import type { Product } from '@/services/productService'
import type { UnitEnum } from '@/types/supabase'
import { ProductMacroFields } from '@/components/products/ProductMacroFields'
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
import { Save, Flame, Utensils, Tag, Scale, Package, FolderTree, Info, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productToEdit?: Product | null
  initialName?: string
  onProductSaved?: (product: Product) => void
}

export const ProductFormSheet: React.FC<ProductFormSheetProps> = ({
  open,
  onOpenChange,
  productToEdit = null,
  initialName = '',
  onProductSaved
}) => {
  const { isDesktop } = useDeviceLayout()
  const { t, formatUnit } = useTranslation()
  const form = useProductForm({ open, onOpenChange, productToEdit, initialName, onProductSaved })

  const title = form.isEditing
    ? t('dialogs.productForm.editTitle')
    : t('dialogs.productForm.addTitle')
  const subtitle = form.isEditing ? t('products.subtitle') : t('products.householdProduct')

  const headerContent = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Package className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  )

  const formBody = (
    <form onSubmit={form.handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
        {form.errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-medium">
            {form.errorMsg}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>{t('dialogs.productForm.hierarchyLabel')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-background border border-border rounded-xl">
            <button
              type="button"
              onClick={() => form.setIsGeneral(false)}
              className={cn(
                'py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]',
                !form.isGeneral
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('products.specific')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                form.setIsGeneral(true)
                form.setParentId('')
              }}
              className={cn(
                'py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]',
                form.isGeneral
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>{t('products.general')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span>{t('dialogs.productForm.nameLabel')} *</span>
          </label>
          <Input
            placeholder={t('dialogs.productForm.namePlaceholder')}
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            className="bg-background border-input focus-visible:ring-primary text-sm h-11"
            autoFocus={!form.isEditing}
          />
        </div>

        {!form.isGeneral && (
          <div className="space-y-1.5 animate-in fade-in-50 duration-200">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              <span>{t('dialogs.productForm.parentSelectLabel')}</span>
            </label>
            <select
              value={form.parentId}
              onChange={(e) => form.setParentId(e.target.value)}
              className="w-full h-11 px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="" className="bg-card text-foreground">
                {t('products.noParent')}
              </option>
              {form.parentProducts.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-foreground">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.isGeneral && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5 animate-in fade-in-50 duration-200">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-foreground">{t('products.general')}</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                {t('products.generalProductNote')}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('dialogs.productForm.categoryLabel')}</span>
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => form.setCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-11 px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="" className="bg-card text-foreground">
                {t('common.select')}
              </option>
              {form.categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-card text-foreground">
                  {form.getCategoryLabel(cat.name)}
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
              value={form.unitType}
              onChange={(e) => form.setUnitType(e.target.value as UnitEnum)}
              className="w-full h-11 px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="pcs" className="bg-card text-foreground">
                pcs ({formatUnit('pcs')})
              </option>
              <option value="g" className="bg-card text-foreground">
                g ({formatUnit('g')})
              </option>
              <option value="ml" className="bg-card text-foreground">
                ml ({formatUnit('ml')})
              </option>
            </select>
          </div>
        </div>

        {!form.isGeneral && (
          <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">{t('products.macrosPer100')}</div>
                <div className="text-[11px] text-muted-foreground">{t('cookbook.macros')}</div>
              </div>
            </div>

            <Checkbox
              id="isFood"
              checked={form.isFood}
              onCheckedChange={(checked) => form.setIsFood(!!checked)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5 rounded-md"
            />
          </div>
        )}

        {!form.isGeneral && form.isFood && (
          <ProductMacroFields
            unitSuffix={form.unitSuffix}
            kcal={form.kcal}
            setKcal={form.setKcal}
            protein={form.protein}
            setProtein={form.setProtein}
            carbs={form.carbs}
            setCarbs={form.setCarbs}
            fat={form.fat}
            setFat={form.setFat}
          />
        )}
      </div>

      <div className="p-4 border-t border-border bg-card/90 flex flex-row gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={form.isSubmitting}
          className="flex-1 border-border bg-card hover:bg-muted text-foreground rounded-xl h-11 cursor-pointer"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={form.isSubmitting || !form.name.trim()}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 flex items-center justify-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
        >
          {form.isSubmitting ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>
                {form.isEditing ? t('dialogs.productForm.submitEdit') : t('dialogs.productForm.submitAdd')}
              </span>
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
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">{subtitle}</DialogDescription>
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
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">{subtitle}</SheetDescription>
          {headerContent}
        </SheetHeader>
        {formBody}
      </SheetContent>
    </Sheet>
  )
}

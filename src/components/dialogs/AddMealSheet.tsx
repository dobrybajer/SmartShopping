import React from 'react'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useMealForm } from '@/hooks/useMealForm'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { MealIngredientsSection } from '@/components/meals/MealIngredientsSection'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddMealSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealToEdit?: MealWithIngredients | null
  onMealCreated?: () => void
  onMealSaved?: () => void
}

export const AddMealSheet: React.FC<AddMealSheetProps> = ({
  open,
  onOpenChange,
  mealToEdit = null,
  onMealCreated,
  onMealSaved
}) => {
  const { isDesktop } = useDeviceLayout()
  const { t } = useTranslation()
  const form = useMealForm({ open, onOpenChange, mealToEdit, onMealCreated, onMealSaved })

  const dialogTitle = form.isEditing
    ? t('dialogs.mealForm.editTitle')
    : t('dialogs.mealForm.addTitle')
  const submitLabel = form.isEditing
    ? t('dialogs.mealForm.submitEdit')
    : t('dialogs.mealForm.submitAdd')

  const headerContent = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
          {dialogTitle}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('cookbook.subtitle')}</p>
      </div>
    </div>
  )

  const bodyContent = (
    <div className="py-4 flex flex-col gap-4 text-xs flex-1 overflow-y-auto px-6 scrollbar-thin">
      {form.mealCategories.length > 0 && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-background border border-border">
          <label className="font-bold text-foreground text-xs">
            {t('dialogs.mealForm.categoryLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {form.mealCategories.map((cat) => {
              const isSelected = form.categoryId === cat.id
              const labelKey = `categories.${cat.name}` as TranslationKey
              const translated = t(labelKey)
              const label = translated === labelKey ? cat.name : translated

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => form.setCategoryId(isSelected ? null : cat.id)}
                  className={cn(
                    'min-h-[44px] px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="font-semibold text-foreground block mb-1">
          {t('dialogs.mealForm.nameLabel')} *
        </label>
        <Input
          placeholder={t('dialogs.mealForm.namePlaceholder')}
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
        />
      </div>

      <div>
        <label className="font-semibold text-foreground block mb-1">
          {t('dialogs.mealForm.descriptionLabel')}
        </label>
        <Input
          placeholder={t('dialogs.mealForm.descriptionPlaceholder')}
          value={form.description}
          onChange={(e) => form.setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="font-semibold text-foreground block mb-1">
          {t('dialogs.mealForm.tagsLabel')}
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder={t('dialogs.mealForm.tagsPlaceholder')}
            value={form.tagInput}
            onChange={(e) => form.setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                form.handleAddTag()
              }
            }}
          />
          <Button onClick={form.handleAddTag} variant="outline" className="shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                onClick={() => form.handleRemoveTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      <MealIngredientsSection
        ingredients={form.ingredients}
        availableProducts={form.availableProducts}
        categories={form.categories}
        selectedProductId={form.selectedProductId}
        selectedProductName={form.selectedProductName}
        selectedProductUnit={form.selectedProductUnit}
        selectedInputUnit={form.selectedInputUnit}
        onInputUnitChange={form.setSelectedInputUnit}
        quantityInput={form.quantityInput}
        onQuantityChange={form.setQuantityInput}
        onProductNameChange={form.handleProductNameChange}
        onSelectProduct={form.handleSelectProduct}
        onAddIngredient={form.handleAddIngredient}
        onRemoveIngredient={form.handleRemoveIngredient}
        onChangeReferenceProduct={form.handleChangeReferenceProduct}
        onOpenAddProduct={() => form.setIsAddProductOpen(true)}
      />

      <div>
        <label className="font-semibold text-foreground block mb-1">
          {t('dialogs.mealForm.stepsLabel')}
        </label>
        <textarea
          placeholder={t('dialogs.mealForm.stepsPlaceholder')}
          value={form.preparationSteps}
          onChange={(e) => form.setPreparationSteps(e.target.value)}
          className="w-full min-h-[80px] p-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="font-semibold text-foreground block mb-1">
          {t('dialogs.mealForm.commentsLabel')}
        </label>
        <Input
          placeholder={t('dialogs.mealForm.commentsPlaceholder')}
          value={form.comments}
          onChange={(e) => form.setComments(e.target.value)}
        />
      </div>
    </div>
  )

  const footerContent = (
    <div className="p-4 border-t border-border bg-card/90 shrink-0">
      <Button
        onClick={form.handleSubmit}
        disabled={!form.name.trim() || form.isSubmitting}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-5 h-5" />
        <span>{submitLabel}</span>
      </Button>
    </div>
  )

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="max-w-lg w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
              <DialogDescription className="sr-only">{t('cookbook.subtitle')}</DialogDescription>
              {headerContent}
            </DialogHeader>
            {bodyContent}
            {footerContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            className="max-h-[92vh] bg-card border-t border-border text-foreground rounded-t-3xl flex flex-col p-0 overflow-hidden"
          >
            <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <SheetTitle className="sr-only">{dialogTitle}</SheetTitle>
              <SheetDescription className="sr-only">{t('cookbook.subtitle')}</SheetDescription>
              {headerContent}
            </SheetHeader>
            {bodyContent}
            {footerContent}
          </SheetContent>
        </Sheet>
      )}

      <ProductFormSheet
        open={form.isAddProductOpen}
        onOpenChange={form.setIsAddProductOpen}
        initialName={form.selectedProductName}
        onProductSaved={form.handleProductSaved}
      />
    </>
  )
}

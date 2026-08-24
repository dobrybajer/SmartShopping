import React, { useState } from 'react'
import { useShoppingStore, type MealWithIngredients } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Flame, Scale, Globe, Home, Plus, Check } from 'lucide-react'

interface MealDetailsSheetProps {
  meal: MealWithIngredients | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MealDetailsSheet: React.FC<MealDetailsSheetProps> = ({
  meal,
  open,
  onOpenChange
}) => {
  const { addMealToDraft } = useShoppingStore()
  const { isDesktop } = useDeviceLayout()
  const { t, formatQuantity } = useTranslation()
  const [targetKcal, setTargetKcal] = useState<number | ''>('')
  const [isAdded, setIsAdded] = useState(false)

  if (!meal) return null

  // Calculate base macros
  let baseKcal = 0
  let baseProtein = 0
  let baseCarbs = 0
  let baseFat = 0

  meal.ingredients.forEach((ing) => {
    if (ing.product) {
      const factor = ing.product.unit_type === 'pcs' ? ing.base_quantity : ing.base_quantity / 100
      baseKcal += (ing.product.kcal_per_100 || 0) * factor
      baseProtein += (ing.product.protein_per_100 || 0) * factor
      baseCarbs += (ing.product.carbs_per_100 || 0) * factor
      baseFat += (ing.product.fat_per_100 || 0) * factor
    }
  })

  // Multiplier
  const targetKcalValue = typeof targetKcal === 'number' && targetKcal > 0 ? targetKcal : baseKcal
  const multiplier = baseKcal > 0 ? targetKcalValue / baseKcal : 1
  const activeKcal = baseKcal * multiplier
  const scaledProtein = Math.round(baseProtein * multiplier * 10) / 10
  const scaledCarbs = Math.round(baseCarbs * multiplier * 10) / 10
  const scaledFat = Math.round(baseFat * multiplier * 10) / 10

  const handleAddToDraft = () => {
    addMealToDraft(meal, typeof targetKcal === 'number' ? targetKcal : undefined)
    setIsAdded(true)
    setTimeout(() => {
      setIsAdded(false)
      onOpenChange(false)
    }, 800)
  }

  const isGlobal = meal.type === 'Global' || !meal.household_id

  const headerContent = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-lg font-bold text-foreground truncate">{meal.name}</h3>
        {isGlobal ? (
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1 shrink-0"
          >
            <Globe className="w-3 h-3" />
            <span>{t('common.global')}</span>
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1 shrink-0"
          >
            <Home className="w-3 h-3" />
            <span>{t('navigation.households')}</span>
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl text-primary font-extrabold text-xs shrink-0">
        <Flame className="w-3.5 h-3.5" />
        <span>{Math.round(activeKcal)} {t('common.kcal')}</span>
      </div>
    </div>
  )

  const bodyContent = (
    <div className="py-4 flex flex-col gap-5 flex-1 overflow-y-auto px-6 scrollbar-thin">
      {meal.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{meal.description}</p>
      )}

      {/* Tags */}
      {meal.tags && meal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meal.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Scaler Card */}
      <div className="p-4 rounded-xl bg-background border border-border flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-primary" />
            <span>{t('cookbook.scalePortions')} ({t('cookbook.targetCalories')}):</span>
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {Math.round(multiplier * 100) / 100}x
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder={`${Math.round(baseKcal)} ${t('common.kcal')}`}
            value={targetKcal}
            onChange={(e) =>
              setTargetKcal(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="h-10 bg-card border-input font-mono text-xs text-foreground"
          />
          <Button
            variant="outline"
            onClick={() => setTargetKcal('')}
            className="h-10 text-xs shrink-0 cursor-pointer"
          >
            {t('common.clear')}
          </Button>
        </div>

        {/* Scaled Macro Display */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center font-mono">
          <div className="p-2 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block">{t('common.proteinShort')}</span>
            <span className="text-xs font-bold text-blue-400">{scaledProtein} g</span>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block">{t('common.carbsShort')}</span>
            <span className="text-xs font-bold text-amber-400">{scaledCarbs} g</span>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-muted-foreground block">{t('common.fatShort')}</span>
            <span className="text-xs font-bold text-rose-400">{scaledFat} g</span>
          </div>
        </div>
      </div>

      {/* Ingredients List */}
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          {t('cookbook.ingredients')} ({meal.ingredients.length})
        </h4>
        <div className="flex flex-col gap-2">
          {meal.ingredients.map((ing) => {
            const scaledQty = Math.round((ing.base_quantity * multiplier) * 10) / 10
            return (
              <div
                key={ing.id}
                className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {ing.product?.name || 'Product'}
                  </span>
                  {ing.is_pantry_item && (
                    <span className="text-[10px] text-muted-foreground ml-2">({t('cookbook.pantryItem')})</span>
                  )}
                </div>
                <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                  {formatQuantity(scaledQty, ing.product?.unit_type || 'g')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preparation Steps */}
      {meal.preparation_steps && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {t('cookbook.steps')}
          </h4>
          <p className="text-xs text-foreground whitespace-pre-line leading-relaxed bg-background p-3 rounded-xl border border-border">
            {meal.preparation_steps}
          </p>
        </div>
      )}

      {/* Comments */}
      {meal.comments && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {t('cookbook.notes')}
          </h4>
          <p className="text-xs text-muted-foreground italic bg-background p-3 rounded-xl border border-border">
            "{meal.comments}"
          </p>
        </div>
      )}
    </div>
  )

  const footerContent = (
    <div className="p-4 border-t border-border bg-card/90 shrink-0">
      <Button
        onClick={handleAddToDraft}
        disabled={isAdded}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
      >
        {isAdded ? (
          <>
            <Check className="w-5 h-5" />
            <span>{t('toasts.saved')}</span>
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            <span>{t('cookbook.addToDraft')} ({Math.round(activeKcal)} {t('common.kcal')})</span>
          </>
        )}
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-lg w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
            <DialogTitle className="sr-only">{meal.name}</DialogTitle>
            <DialogDescription className="sr-only">{meal.description || meal.name}</DialogDescription>
            {headerContent}
          </DialogHeader>
          {bodyContent}
          {footerContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] bg-card border-t border-border text-foreground rounded-t-3xl flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
          <SheetTitle className="sr-only">{meal.name}</SheetTitle>
          <SheetDescription className="sr-only">{meal.description || meal.name}</SheetDescription>
          {headerContent}
        </SheetHeader>
        {bodyContent}
        {footerContent}
      </SheetContent>
    </Sheet>
  )
}

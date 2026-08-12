import React, { useState } from 'react'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { useShoppingStore } from '@/store/useShoppingStore'
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
import { Badge } from '@/components/ui/badge'
import { Flame, Plus, Check, Scale } from 'lucide-react'

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
  const [targetKcal, setTargetKcal] = useState<number | ''>('')
  const [isAdded, setIsAdded] = useState(false)

  if (!meal) return null

  // Obliczenia makroskładników bazowych
  let baseKcal = 0
  let baseProtein = 0
  let baseCarbs = 0
  let baseFat = 0

  meal.ingredients.forEach((ing) => {
    if (ing.product) {
      const factor = ing.base_quantity / 100
      baseKcal += (ing.product.kcal_per_100 || 0) * factor
      baseProtein += (ing.product.protein_per_100 || 0) * factor
      baseCarbs += (ing.product.carbs_per_100 || 0) * factor
      baseFat += (ing.product.fat_per_100 || 0) * factor
    }
  })

  baseKcal = Math.round(baseKcal)
  baseProtein = Math.round(baseProtein * 10) / 10
  baseCarbs = Math.round(baseCarbs * 10) / 10
  baseFat = Math.round(baseFat * 10) / 10

  // Mnożnik skalowania
  const activeKcal = targetKcal !== '' && targetKcal > 0 ? targetKcal : baseKcal
  const multiplier = baseKcal > 0 ? activeKcal / baseKcal : 1

  const scaledProtein = Math.round((baseProtein * multiplier) * 10) / 10
  const scaledCarbs = Math.round((baseCarbs * multiplier) * 10) / 10
  const scaledFat = Math.round((baseFat * multiplier) * 10) / 10

  const handleAddToDraft = () => {
    addMealToDraft(meal, typeof targetKcal === 'number' ? targetKcal : undefined)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([30, 50, 30])
      } catch {
        // Ignoruj
      }
    }

    setIsAdded(true)
    setTimeout(() => {
      setIsAdded(false)
      onOpenChange(false)
    }, 600)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{meal.name}</SheetTitle>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-emerald-400 font-extrabold text-xs">
              <Flame className="w-3.5 h-3.5" />
              <span>{Math.round(activeKcal)} kcal</span>
            </div>
          </div>
          {meal.description && (
            <SheetDescription>{meal.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="py-4 flex flex-col gap-5">
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
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Skaluj porcję (Target Kcal):</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Mnożnik: <strong>{Math.round(multiplier * 100) / 100}x</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder={`Domyślnie ${baseKcal} kcal`}
                value={targetKcal}
                onChange={(e) =>
                  setTargetKcal(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="h-10 bg-zinc-950 font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={() => setTargetKcal('')}
                className="h-10 text-xs shrink-0"
              >
                Reset
              </Button>
            </div>

            {/* Scaled Macro Display */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center font-mono">
              <div className="p-2 rounded-lg bg-zinc-950/60">
                <span className="text-[10px] text-zinc-500 block">Białko</span>
                <span className="text-xs font-bold text-emerald-400">{scaledProtein} g</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-950/60">
                <span className="text-[10px] text-zinc-500 block">Węglowodany</span>
                <span className="text-xs font-bold text-emerald-400">{scaledCarbs} g</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-950/60">
                <span className="text-[10px] text-zinc-500 block">Tłuszcze</span>
                <span className="text-xs font-bold text-emerald-400">{scaledFat} g</span>
              </div>
            </div>
          </div>

          {/* Ingredients List */}
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Składniki ({meal.ingredients.length})
            </h4>
            <div className="flex flex-col gap-2">
              {meal.ingredients.map((ing) => {
                const scaledQty = Math.round((ing.base_quantity * multiplier) * 10) / 10
                return (
                  <div
                    key={ing.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-200">
                        {ing.product?.name || 'Produkt'}
                      </span>
                      {ing.is_pantry_item && (
                        <span className="text-[10px] text-zinc-500 ml-2">(Przyprawa/Spiżarnia)</span>
                      )}
                    </div>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {scaledQty} {ing.product?.unit_type || 'g'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preparation Steps */}
          {meal.preparation_steps && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Kroki Przygotowania
              </h4>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                {meal.preparation_steps}
              </p>
            </div>
          )}

          {/* Comments */}
          {meal.comments && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Komentarze i Uwagi
              </h4>
              <p className="text-xs text-zinc-400 italic bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                "{meal.comments}"
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="pt-2">
          <Button
            onClick={handleAddToDraft}
            disabled={isAdded}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2"
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5" />
                <span>Dodano do Koszyka!</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Wrzuć do Koszyka ({Math.round(activeKcal)} kcal)</span>
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

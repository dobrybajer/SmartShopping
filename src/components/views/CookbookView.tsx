import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { mealService } from '@/services/mealService'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Flame, BookOpen, Trash2 } from 'lucide-react'

export const CookbookView: React.FC = () => {
  const { household } = useAuth()
  const [meals, setMeals] = useState<MealWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const [activeMeal, setActiveMeal] = useState<MealWithIngredients | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)

  const loadMeals = async () => {
    if (!household) return
    setLoading(true)
    const data = await mealService.getMeals(household.id)
    setMeals(data)
    setLoading(false)
  }

  useEffect(() => {
    loadMeals()
  }, [household])

  // Collect all unique tags
  const allTags = Array.from(
    new Set(meals.flatMap((m) => m.tags || []))
  ).filter(Boolean)

  const filteredMeals = meals.filter((meal) => {
    const matchesSearch =
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meal.description && meal.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTag = !selectedTag || (meal.tags && meal.tags.includes(selectedTag))

    return matchesSearch && matchesTag
  })

  const handleDeleteMeal = async (e: React.MouseEvent, mealId: string) => {
    e.stopPropagation()
    if (confirm('Czy na pewno chcesz usunąć ten przepis?')) {
      const success = await mealService.deleteMeal(mealId)
      if (success) {
        setMeals((prev) => prev.filter((m) => m.id !== mealId))
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Search and Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj przepisu lub składnika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800"
          />
        </div>

        <Button
          onClick={() => setIsAddMealOpen(true)}
          size="icon"
          className="h-11 w-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shrink-0 shadow-lg"
          title="Dodaj przepis"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Filter Tags */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setSelectedTag(null)} className="shrink-0">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              Wszystkie
            </Badge>
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className="shrink-0"
            >
              <Badge
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1 text-xs"
              >
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* List Container */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-zinc-500">Pobieranie przepisów z bazy...</p>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Brak przepisów w bazy</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            {searchQuery
              ? 'Brak wyników pasujących do wyszukiwania.'
              : 'Kliknij przycisk +, aby dodać swój pierwszy przepis w tej książce kucharskiej.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMeals.map((meal) => {
            // Oblicz bazowe kcal i makro dla karty
            let totalKcal = 0
            let totalProtein = 0
            let totalCarbs = 0
            let totalFat = 0

            meal.ingredients.forEach((ing) => {
              if (ing.product) {
                const factor = ing.base_quantity / 100
                totalKcal += (ing.product.kcal_per_100 || 0) * factor
                totalProtein += (ing.product.protein_per_100 || 0) * factor
                totalCarbs += (ing.product.carbs_per_100 || 0) * factor
                totalFat += (ing.product.fat_per_100 || 0) * factor
              }
            })

            return (
              <div
                key={meal.id}
                onClick={() => {
                  setActiveMeal(meal)
                  setIsDetailsOpen(true)
                }}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-emerald-500/50 transition-all flex flex-col gap-3 cursor-pointer group shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                      {meal.name}
                    </h4>
                    {meal.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        {meal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {totalKcal > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-emerald-400 text-xs font-bold shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{Math.round(totalKcal)} kcal</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDeleteMeal(e, meal.id)}
                      className="text-zinc-600 hover:text-red-400 p-1.5 transition-colors"
                      title="Usuń przepis"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro breakdown */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-3 font-mono">
                    <span>B: <strong className="text-zinc-200">{Math.round(totalProtein)}g</strong></span>
                    <span>W: <strong className="text-zinc-200">{Math.round(totalCarbs)}g</strong></span>
                    <span>T: <strong className="text-zinc-200">{Math.round(totalFat)}g</strong></span>
                  </div>

                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex gap-1">
                      {meal.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Meal Details Sheet */}
      <MealDetailsSheet
        meal={activeMeal}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Add Meal Sheet */}
      <AddMealSheet
        open={isAddMealOpen}
        onOpenChange={setIsAddMealOpen}
        onMealCreated={loadMeals}
      />
    </div>
  )
}

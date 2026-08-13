import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { mealService } from '@/services/mealService'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Flame, BookOpen, Trash2, Globe, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export const CookbookView: React.FC = () => {
  const { household } = useAuth()
  const [meals, setMeals] = useState<MealWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Global' | 'Household'>('all')
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

    const isGlobal = meal.type === 'Global' || !meal.household_id
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'Global' && isGlobal) ||
      (typeFilter === 'Household' && !isGlobal)

    return matchesSearch && matchesTag && matchesType
  })

  const handleDeleteMeal = async (e: React.MouseEvent, meal: MealWithIngredients) => {
    e.stopPropagation()
    const isGlobal = meal.type === 'Global' || !meal.household_id
    const confirmMsg = isGlobal
      ? 'Czy na pewno chcesz usunąć ten przepis globalny? Zniknie on ze wszystkich gospodarstw.'
      : 'Czy na pewno chcesz usunąć ten przepis ze swojego gospodarstwa?'

    if (confirm(confirmMsg)) {
      const success = await mealService.deleteMeal(meal.id)
      if (success) {
        setMeals((prev) => prev.filter((m) => m.id !== meal.id))
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
          className="h-11 w-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title="Dodaj przepis"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Scope and Filter Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Type / Scope Filters */}
        <button onClick={() => setTypeFilter('all')} className="shrink-0">
          <Badge
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1 text-xs"
          >
            Wszystkie
          </Badge>
        </button>

        <button onClick={() => setTypeFilter(typeFilter === 'Household' ? 'all' : 'Household')} className="shrink-0">
          <Badge
            variant={typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer px-2.5 py-1 text-xs flex items-center gap-1",
              typeFilter === 'Household'
                ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                : "text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
            )}
          >
            <Home className="w-3 h-3" />
            <span>Gospodarstwo</span>
          </Badge>
        </button>

        <button onClick={() => setTypeFilter(typeFilter === 'Global' ? 'all' : 'Global')} className="shrink-0">
          <Badge
            variant={typeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer px-2.5 py-1 text-xs flex items-center gap-1",
              typeFilter === 'Global'
                ? "bg-sky-500 text-black border-sky-400 font-bold"
                : "text-zinc-400 border-zinc-800 hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3 h-3" />
            <span>Globalne</span>
          </Badge>
        </button>

        {/* Separator if tags exist */}
        {allTags.length > 0 && <span className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />}

        {/* Tag pills */}
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
          <p className="text-sm font-semibold text-zinc-300">Brak przepisów w wybranym filtrze</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            {searchQuery || typeFilter !== 'all' || selectedTag
              ? 'Brak wyników pasujących do wybranych kryteriów.'
              : 'Kliknij przycisk +, aby dodać swój pierwszy przepis w tej książce kucharskiej.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMeals.map((meal) => {
            const isGlobal = meal.type === 'Global' || !meal.household_id

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
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                        {meal.name}
                      </h4>

                      {/* Scope Badge */}
                      {isGlobal ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          <span>Globalny</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5" />
                          <span>Gospodarstwo</span>
                        </Badge>
                      )}
                    </div>

                    {meal.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">
                        {meal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {totalKcal > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-emerald-400 text-xs font-bold shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{Math.round(totalKcal)} kcal</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDeleteMeal(e, meal)}
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

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { mealService } from '@/services/mealService'
import { useShoppingStore, type MealWithIngredients } from '@/store/useShoppingStore'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Plus,
  Flame,
  BookOpen,
  Trash2,
  Globe,
  Home,
  ShoppingCart,
  Check,
  Utensils
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopCookbookView: React.FC = () => {
  const { household } = useAuth()
  const { addMealToDraft } = useShoppingStore()
  const [meals, setMeals] = useState<MealWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Global' | 'Household'>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const [activeMeal, setActiveMeal] = useState<MealWithIngredients | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [addedMealId, setAddedMealId] = useState<string | null>(null)

  const loadMeals = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const data = await mealService.getMeals(household.id)
    setMeals(data)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadMeals()
  }, [loadMeals])

  useEffect(() => {
    const handleRefresh = () => {
      loadMeals()
    }
    window.addEventListener('smartshopping_refresh_meals', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_meals', handleRefresh)
  }, [loadMeals])

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

  const handleQuickAdd = (e: React.MouseEvent, meal: MealWithIngredients) => {
    e.stopPropagation()
    addMealToDraft(meal)
    setAddedMealId(meal.id)
    setTimeout(() => {
      setAddedMealId(null)
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Controls Bar: Search & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 shadow-sm backdrop-blur-md">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj przepisu, opisu lub składnika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-zinc-900/90 border-zinc-800 focus-visible:ring-emerald-500 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddMealOpen(true)}
            className="h-11 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-lg shadow-emerald-950/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nowy Przepis</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {/* Scope Filters */}
        <button onClick={() => setTypeFilter('all')} className="cursor-pointer">
          <Badge
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs transition-all",
              typeFilter === 'all'
                ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-bold shadow-xs"
                : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
            )}
          >
            Wszystkie ({meals.length})
          </Badge>
        </button>

        <button
          onClick={() => setTypeFilter(typeFilter === 'Household' ? 'all' : 'Household')}
          className="cursor-pointer"
        >
          <Badge
            variant={typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              typeFilter === 'Household'
                ? "bg-emerald-500 text-black border-emerald-400 font-bold shadow-xs shadow-emerald-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Gospodarstwo ({meals.filter((m) => m.type !== 'Global' && m.household_id).length})</span>
          </Badge>
        </button>

        <button
          onClick={() => setTypeFilter(typeFilter === 'Global' ? 'all' : 'Global')}
          className="cursor-pointer"
        >
          <Badge
            variant={typeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              typeFilter === 'Global'
                ? "bg-sky-500 text-black border-sky-400 font-bold shadow-xs shadow-sky-950/30"
                : "text-zinc-400 border-zinc-800 hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Globalne ({meals.filter((m) => m.type === 'Global' || !m.household_id).length})</span>
          </Badge>
        </button>

        {/* Separator if tags exist */}
        {allTags.length > 0 && <span className="h-5 w-px bg-zinc-800 mx-1" />}

        {/* Tag pills */}
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className="cursor-pointer"
          >
            <Badge
              variant={selectedTag === tag ? 'default' : 'outline'}
              className={cn(
                "px-3 py-1.5 text-xs transition-all",
                selectedTag === tag
                  ? "bg-zinc-800 text-emerald-400 border-emerald-500/50 font-bold"
                  : "text-zinc-400 border-zinc-800/80 hover:border-zinc-700"
              )}
            >
              #{tag}
            </Badge>
          </button>
        ))}
      </div>

      {/* Grid Container */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-zinc-500">Pobieranie przepisów z bazy...</p>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-zinc-950/40 border border-zinc-900 border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-zinc-200">Brak przepisów w wybranym filtrze</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {searchQuery || typeFilter !== 'all' || selectedTag
              ? 'Brak wyników pasujących do wybranych kryteriów filtrowania.'
              : 'Kliknij przycisk Nowy Przepis, aby dodać swoją pierwszą potrawę.'}
          </p>
          {(searchQuery || typeFilter !== 'all' || selectedTag) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('all')
                setSelectedTag(null)
              }}
              className="mt-4 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl"
            >
              Wyczyść filtry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredMeals.map((meal) => {
            const isGlobal = meal.type === 'Global' || !meal.household_id

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

            const isJustAdded = addedMealId === meal.id

            return (
              <div
                key={meal.id}
                onClick={() => {
                  setActiveMeal(meal)
                  setIsDetailsOpen(true)
                }}
                className={cn(
                  "p-5 rounded-2xl bg-zinc-950/80 border transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-xl relative overflow-hidden",
                  isGlobal
                    ? "border-zinc-900 hover:border-sky-500/40 hover:bg-zinc-900/40"
                    : "border-zinc-900 hover:border-emerald-500/50 hover:bg-zinc-900/50"
                )}
              >
                {/* Top: Header, Badges & Kcal */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                          {meal.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isGlobal ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                            >
                              <Globe className="w-2.5 h-2.5" />
                              <span>Globalny</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1"
                            >
                              <Home className="w-2.5 h-2.5" />
                              <span>Gospodarstwo</span>
                            </Badge>
                          )}

                          <span className="text-[11px] text-zinc-500 font-mono">
                            {meal.ingredients.length} składników
                          </span>
                        </div>
                      </div>
                    </div>

                    {totalKcal > 0 && (
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-emerald-400 text-xs font-extrabold shrink-0 shadow-inner">
                        <Flame className="w-4 h-4" />
                        <span>{Math.round(totalKcal)} kcal</span>
                      </div>
                    )}
                  </div>

                  {meal.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {meal.description}
                    </p>
                  )}
                </div>

                {/* Macro summary & Tags */}
                <div className="flex flex-col gap-3 pt-3 border-t border-zinc-900/90">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300">
                        B: <strong className="text-blue-400">{Math.round(totalProtein)}g</strong>
                      </span>
                      <span className="bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300">
                        W: <strong className="text-amber-400">{Math.round(totalCarbs)}g</strong>
                      </span>
                      <span className="bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300">
                        T: <strong className="text-rose-400">{Math.round(totalFat)}g</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Quick Add to Cart Button */}
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, meal)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                          isJustAdded
                            ? "bg-emerald-500 text-black font-extrabold"
                            : "bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-zinc-800 hover:border-emerald-400"
                        )}
                        title="Szybko dodaj składniki tego przepisu do koszyka"
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Dodano!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Do Koszyka</span>
                          </>
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMeal(e, meal)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Usuń przepis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {meal.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-zinc-500 bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Meal Details Sheet / Modal */}
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

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { mealService } from '@/services/mealService'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Plus, Flame, Utensils, Trash2, Globe, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export const CookbookView: React.FC = () => {
  const { household } = useAuth()
  const { t } = useTranslation()
  const [meals, setMeals] = useState<MealWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Global' | 'Household'>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const [activeMeal, setActiveMeal] = useState<MealWithIngredients | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)

  const loadMeals = React.useCallback(async () => {
    if (!household) return
    setLoading(true)
    const data = await mealService.getMeals(household.id)
    setMeals(data)
    setLoading(false)
  }, [household])

  useEffect(() => {
    loadMeals()
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
      ? t('cookbook.deleteConfirm')
      : t('cookbook.deleteConfirm')

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
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cookbook.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>

        <Button
          onClick={() => setIsAddMealOpen(true)}
          size="icon"
          className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 shadow-lg cursor-pointer"
          title={t('cookbook.addRecipe')}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Scope and Filter Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Type / Scope Filters */}
        <button onClick={() => setTypeFilter('all')} className="shrink-0 cursor-pointer">
          <Badge
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1 text-xs"
          >
            {t('common.all')}
          </Badge>
        </button>

        <button onClick={() => setTypeFilter(typeFilter === 'Household' ? 'all' : 'Household')} className="shrink-0 cursor-pointer">
          <Badge
            variant={typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer px-2.5 py-1 text-xs flex items-center gap-1",
              typeFilter === 'Household'
                ? "bg-primary text-primary-foreground border-primary font-bold"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            )}
          >
            <Home className="w-3 h-3" />
            <span>{t('navigation.households')}</span>
          </Badge>
        </button>

        <button onClick={() => setTypeFilter(typeFilter === 'Global' ? 'all' : 'Global')} className="shrink-0 cursor-pointer">
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
            <span>{t('common.global')}</span>
          </Badge>
        </button>

        {/* Separator if tags exist */}
        {allTags.length > 0 && <span className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />}

        {/* Tag pills */}
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className="shrink-0 cursor-pointer"
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
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-2xl p-6">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-foreground">{t('cookbook.noRecipes')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {t('cookbook.subtitle')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredMeals.map((meal) => {
            const isGlobal = meal.type === 'Global' || !meal.household_id

            // Calculate base macros
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
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all flex flex-col gap-3 cursor-pointer group shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {meal.name}
                      </h4>

                      {/* Scope Badge */}
                      {isGlobal ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          <span>{t('common.global')}</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1"
                        >
                          <Home className="w-2.5 h-2.5" />
                          <span>{t('navigation.households')}</span>
                        </Badge>
                      )}
                    </div>

                    {meal.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {meal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {totalKcal > 0 && (
                      <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg text-primary text-xs font-bold shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{Math.round(totalKcal)} {t('common.kcal')}</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDeleteMeal(e, meal)}
                      className="text-muted-foreground hover:text-destructive p-1.5 transition-colors cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Macro breakdown */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-3 font-mono">
                    <span>{t('common.proteinShort')}: <strong className="text-blue-400">{Math.round(totalProtein)}g</strong></span>
                    <span>{t('common.carbsShort')}: <strong className="text-amber-400">{Math.round(totalCarbs)}g</strong></span>
                    <span>{t('common.fatShort')}: <strong className="text-rose-400">{Math.round(totalFat)}g</strong></span>
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

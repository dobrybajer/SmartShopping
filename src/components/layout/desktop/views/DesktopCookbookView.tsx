import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore, type MealWithIngredients } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { mealService } from '@/services/mealService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MealDetailsSheet } from '@/components/dialogs/MealDetailsSheet'
import { AddMealSheet } from '@/components/dialogs/AddMealSheet'
import {
  Search,
  Plus,
  Home,
  Globe,
  Flame,
  Utensils,
  ShoppingCart,
  Check,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const DesktopCookbookView: React.FC = () => {
  const { household } = useAuth()
  const { addMealToDraft } = useShoppingStore()
  const { t } = useTranslation()

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

  // Realtime or global trigger listener
  useEffect(() => {
    const handleRefresh = () => loadMeals()
    window.addEventListener('smartshopping_refresh_meals', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_meals', handleRefresh)
  }, [loadMeals])

  // Extract all unique tags
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>()
    meals.forEach((m) => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach((tag: string) => tagsSet.add(tag))
      }
    })
    return Array.from(tagsSet).sort()
  }, [meals])

  const filteredMeals = meals.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType =
      typeFilter === 'all'
        ? true
        : typeFilter === 'Global'
        ? m.type === 'Global' || !m.household_id
        : m.type !== 'Global' && m.household_id

    const matchesTag = selectedTag ? m.tags?.includes(selectedTag) : true

    return matchesSearch && matchesType && matchesTag
  })

  const handleQuickAdd = (e: React.MouseEvent, meal: MealWithIngredients) => {
    e.stopPropagation()
    addMealToDraft(meal)
    setAddedMealId(meal.id)
    setTimeout(() => setAddedMealId(null), 1500)
  }

  const handleDeleteMeal = async (e: React.MouseEvent, meal: MealWithIngredients) => {
    e.stopPropagation()
    if (confirm(t('cookbook.deleteConfirm'))) {
      const success = await mealService.deleteMeal(meal.id)
      if (success) {
        setMeals((prev) => prev.filter((m) => m.id !== meal.id))
      }
    }
  }

  const householdCount = meals.filter((m) => m.type !== 'Global' && m.household_id).length
  const globalCount = meals.filter((m) => m.type === 'Global' || !m.household_id).length
  const totalCount = meals.length

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cookbook.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background border-input focus-visible:ring-primary rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddMealOpen(true)}
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('cookbook.addRecipe')}</span>
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
              "px-3.5 py-1.5 text-xs transition-all font-medium",
              typeFilter === 'all'
                ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-border/80"
            )}
          >
            {t('common.all')} ({totalCount})
          </Badge>
        </button>

        <button
          onClick={() => setTypeFilter(typeFilter === 'Household' ? 'all' : 'Household')}
          className="cursor-pointer"
        >
          <Badge
            variant={typeFilter === 'Household' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              typeFilter === 'Household'
                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t('navigation.households')} ({householdCount})</span>
          </Badge>
        </button>

        <button
          onClick={() => setTypeFilter(typeFilter === 'Global' ? 'all' : 'Global')}
          className="cursor-pointer"
        >
          <Badge
            variant={typeFilter === 'Global' ? 'default' : 'outline'}
            className={cn(
              "px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition-all font-medium",
              typeFilter === 'Global'
                ? "bg-sky-500 text-white border-sky-400 font-bold shadow-xs"
                : "text-muted-foreground border-border hover:border-sky-500/40 hover:text-sky-300"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('common.global')} ({globalCount})</span>
          </Badge>
        </button>

        {/* Separator for Tags */}
        {allTags.length > 0 && <span className="h-5 w-px bg-border mx-1" />}

        {/* Tag Pills */}
        {allTags.map((tag) => {
          const isSelected = selectedTag === tag
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(isSelected ? null : tag)}
              className="cursor-pointer"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  "px-3 py-1.5 text-xs transition-all",
                  isSelected
                    ? "bg-card text-primary border-primary/50 font-bold"
                    : "text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                )}
              >
                #{tag}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Grid of Meal Cards */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-4">
            <Utensils className="w-8 h-8" />
          </div>
          <p className="text-base font-bold text-foreground">{t('cookbook.noRecipes')}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {searchQuery || typeFilter !== 'all' || selectedTag
              ? t('products.emptySubtitle')
              : t('cookbook.emptySubtitle')}
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
              className="mt-4 text-xs border-border bg-card text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
            >
              {t('common.clear')}
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
                const factor = ing.product.unit_type === 'pcs' ? ing.base_quantity : ing.base_quantity / 100
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
                  "p-5 rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-xl relative overflow-hidden",
                  isGlobal
                    ? "border-border hover:border-sky-500/40 hover:bg-muted/40"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {/* Top: Header, Badges & Kcal */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {meal.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isGlobal ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                            >
                              <Globe className="w-2.5 h-2.5" />
                              <span>{t('common.global')}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0 bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1"
                            >
                              <Home className="w-2.5 h-2.5" />
                              <span>{t('navigation.households')}</span>
                            </Badge>
                          )}

                          <span className="text-[11px] text-muted-foreground font-mono">
                            {meal.ingredients.length} {t('cookbook.ingredients').toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {totalKcal > 0 && (
                      <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl text-primary text-xs font-extrabold shrink-0 shadow-inner">
                        <Flame className="w-4 h-4" />
                        <span>{Math.round(totalKcal)} {t('common.kcal')}</span>
                      </div>
                    )}
                  </div>

                  {meal.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {meal.description}
                    </p>
                  )}
                </div>

                {/* Macro summary & Tags */}
                <div className="flex flex-col gap-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
                        {t('common.proteinShort')}: <strong className="text-blue-400">{Math.round(totalProtein)}g</strong>
                      </span>
                      <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
                        {t('common.carbsShort')}: <strong className="text-amber-400">{Math.round(totalCarbs)}g</strong>
                      </span>
                      <span className="bg-background px-2 py-0.5 rounded-md border border-border text-foreground">
                        {t('common.fatShort')}: <strong className="text-rose-400">{Math.round(totalFat)}g</strong>
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
                            ? "bg-primary text-primary-foreground font-extrabold"
                            : "bg-card hover:bg-primary hover:text-primary-foreground text-primary border border-border hover:border-primary"
                        )}
                        title={t('cookbook.addToDraft')}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{t('toasts.saved')}</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{t('navigation.draft')}</span>
                          </>
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMeal(e, meal)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {meal.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-md"
                        >
                          #{tag}
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

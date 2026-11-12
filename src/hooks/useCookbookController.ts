import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useShoppingStore, type MealWithIngredients } from '@/store/useShoppingStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useTranslation } from '@/i18n'
import { mealService } from '@/services/mealService'
import {
  calculateIngredientMacros,
  resolveEffectiveIngredientMacros,
  sumMacroNutrients,
  type MacroNutrients
} from '@/lib/calculations/macroCalculations'

interface UseCookbookControllerOptions {
  listenToRefreshEvent?: boolean
}

export function computeMealCardMacros(meal: MealWithIngredients): MacroNutrients {
  const perIngredient = meal.ingredients.map((ing) => {
    if (!ing.product) {
      return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    }
    const resolved = resolveEffectiveIngredientMacros(ing.product, ing.reference_product)
    return calculateIngredientMacros(
      ing.base_quantity,
      resolved.macros,
      ing.product.unit_type || 'g'
    )
  })
  return sumMacroNutrients(perIngredient)
}

export function useCookbookController(options: UseCookbookControllerOptions = {}) {
  const { listenToRefreshEvent = false } = options
  const { household } = useAuth()
  const addMealToDraft = useShoppingStore((state) => state.addMealToDraft)
  const pantryMapByProductId = usePantryStore((state) => state.pantryMapByProductId)
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

  useEffect(() => {
    if (!listenToRefreshEvent) return
    const handleRefresh = () => loadMeals()
    window.addEventListener('smartshopping_refresh_meals', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_meals', handleRefresh)
  }, [listenToRefreshEvent, loadMeals])

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>()
    meals.forEach((m) => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach((tag: string) => tagsSet.add(tag))
      }
    })
    return Array.from(tagsSet).sort()
  }, [meals])

  const filteredMeals = useMemo(() => {
    return meals.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const isGlobal = m.type === 'Global' || !m.household_id
      const matchesType =
        typeFilter === 'all'
          ? true
          : typeFilter === 'Global'
            ? isGlobal
            : !isGlobal

      const matchesTag = selectedTag ? m.tags?.includes(selectedTag) : true

      return matchesSearch && matchesType && matchesTag
    })
  }, [meals, searchQuery, typeFilter, selectedTag])

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

  const openMealDetails = (meal: MealWithIngredients) => {
    setActiveMeal(meal)
    setIsDetailsOpen(true)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setSelectedTag(null)
  }

  const householdCount = meals.filter((m) => m.type !== 'Global' && m.household_id).length
  const globalCount = meals.filter((m) => m.type === 'Global' || !m.household_id).length

  return {
    meals,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    selectedTag,
    setSelectedTag,
    allTags,
    filteredMeals,
    householdCount,
    globalCount,
    totalCount: meals.length,
    activeMeal,
    isDetailsOpen,
    setIsDetailsOpen,
    isAddMealOpen,
    setIsAddMealOpen,
    addedMealId,
    pantryMapByProductId,
    loadMeals,
    handleQuickAdd,
    handleDeleteMeal,
    openMealDetails,
    resetFilters
  }
}


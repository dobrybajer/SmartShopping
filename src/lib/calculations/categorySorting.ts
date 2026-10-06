import type {
  RawCategoryRow,
  HouseholdCategorySettingRow,
  ResolvedCategory,
  CategoryReorderItem
} from '@/types/category'

/**
 * Standard default global product categories with initial 1:1 ID and sort_order matching
 * the database schema and internationalization slug definitions.
 */
export const DEFAULT_PRODUCT_CATEGORIES: RawCategoryRow[] = [
  { id: 1, name: 'fruits_vegetables', sort_order: 1, household_id: null, is_non_food: false },
  { id: 2, name: 'bakery', sort_order: 2, household_id: null, is_non_food: false },
  { id: 3, name: 'dairy', sort_order: 3, household_id: null, is_non_food: false },
  { id: 4, name: 'meat_fish', sort_order: 4, household_id: null, is_non_food: false },
  { id: 5, name: 'pantry', sort_order: 5, household_id: null, is_non_food: false },
  { id: 6, name: 'beverages', sort_order: 6, household_id: null, is_non_food: false },
  { id: 7, name: 'household', sort_order: 7, household_id: null, is_non_food: true },
  { id: 8, name: 'other', sort_order: 8, household_id: null, is_non_food: true }
]

/**
 * Ensures that if a household has no categories (empty array),
 * the default global categories are returned so they can be managed.
 */
export function ensureDefaultGlobalCategories(categories: RawCategoryRow[]): RawCategoryRow[] {
  if (!categories || categories.length === 0) {
    return [...DEFAULT_PRODUCT_CATEGORIES]
  }
  return categories
}

/**
 * Resolves a unified, sorted list of categories for a household by merging
 * raw categories (global + household-scoped) with per-household settings.
 */
export function resolveCategoriesWithSettings(
  categories: RawCategoryRow[],
  settings: HouseholdCategorySettingRow[] = [],
  activeCategoryIds?: Set<number>
): ResolvedCategory[] {
  const settingsMap = new Map<number, HouseholdCategorySettingRow>()
  settings.forEach((s) => settingsMap.set(s.category_id, s))

  const resolved: ResolvedCategory[] = (categories || []).map((cat) => {
    const setting = settingsMap.get(cat.id)
    const isGlobal = !cat.household_id
    const sortOrder = setting ? setting.custom_sort_order : (cat.sort_order ?? 99) * 10
    const isHidden = setting ? setting.is_hidden : false
    const hasActiveItems = activeCategoryIds ? activeCategoryIds.has(cat.id) : false

    return {
      id: cat.id,
      name: cat.name,
      is_global: isGlobal,
      household_id: cat.household_id,
      sort_order: sortOrder,
      is_hidden: isHidden,
      is_non_food: cat.is_non_food ?? false,
      custom_name: setting?.custom_name || null,
      has_active_items: hasActiveItems
    }
  })

  // Sort deterministically by sort_order ASC, then by name ASC
  return resolved.sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Filters categories for active shopping displays.
 * Implements the critical safety fallback from ADR-006:
 * If a category is marked hidden, but currently has active shopping list items,
 * it remains visible so the shopper never misses items in the supermarket.
 */
export function filterVisibleCategoriesForShopping(
  resolvedCategories: ResolvedCategory[]
): ResolvedCategory[] {
  return resolvedCategories.filter((cat) => !cat.is_hidden || cat.has_active_items)
}

/**
 * Calculates sparse intervals (10, 20, 30, 40...) for a list of category IDs
 * in their new desired order.
 */
export function calculateSparseIntervals(
  orderedCategoryIds: number[],
  step: number = 10
): CategoryReorderItem[] {
  return orderedCategoryIds.map((id, index) => ({
    category_id: id,
    custom_sort_order: (index + 1) * step
  }))
}

export type CategoryValidationError = 'empty' | 'too_short' | 'too_long' | 'duplicate'

export interface CategoryValidationResult {
  valid: boolean
  error?: CategoryValidationError
}

/**
 * Validates a category name according to SmartShopping business constraints:
 * - Not empty / whitespace only
 * - Length between 2 and 40 characters
 * - Case-insensitive uniqueness within existing household/global categories
 */
export function validateCategoryName(
  name: string,
  existingCategories: Array<{ id: number; name: string }>,
  currentCategoryId?: number
): CategoryValidationResult {
  const trimmed = name.trim()

  if (!trimmed) {
    return { valid: false, error: 'empty' }
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'too_short' }
  }

  if (trimmed.length > 40) {
    return { valid: false, error: 'too_long' }
  }

  const normalized = trimmed.toLowerCase()
  const isDuplicate = existingCategories.some((cat) => {
    if (currentCategoryId && cat.id === currentCategoryId) {
      return false
    }
    return cat.name.trim().toLowerCase() === normalized
  })

  if (isDuplicate) {
    return { valid: false, error: 'duplicate' }
  }

  return { valid: true }
}

export interface AisleGroup<T> {
  categoryId: number | null
  name: string
  sort_order: number
  is_hidden: boolean
  has_fallback_items: boolean
  items: T[]
}

/**
 * Groups active shopping list items into ordered supermarket aisles according to
 * the resolved category hierarchy and custom household order.
 */
export function groupItemsByAisle<
  T extends {
    category_id?: number | null
    category?: {
      id: number
      name: string
      sort_order?: number
    } | null
    product_id?: string | null
    product?: {
      id?: string
      name?: string
      category_id?: number | null
      category?: {
        id: number
        name: string
        sort_order?: number
      } | null
    } | null
  }
>(
  items: T[],
  resolvedCategories: ResolvedCategory[],
  otherLabel: string = 'other'
): AisleGroup<T>[] {
  const categoryMap = new Map<number, ResolvedCategory>()
  resolvedCategories.forEach((rc) => categoryMap.set(rc.id, rc))

  const aisleMap = new Map<string, AisleGroup<T>>()

  items.forEach((item) => {
    // Check item.category_id first (override from item), then item.category, then fall back to product catalog category
    const catId = item.category_id ?? item.category?.id ?? item.product?.category_id ?? item.product?.category?.id ?? null
    const resolvedCat = catId !== null ? categoryMap.get(catId) : undefined

    let key: string
    let name: string
    let sortOrder: number
    let isHidden = false
    let hasFallback = false

    if (resolvedCat) {
      key = `cat_${resolvedCat.id}`
      name = resolvedCat.custom_name || resolvedCat.name
      sortOrder = resolvedCat.sort_order
      isHidden = resolvedCat.is_hidden
      hasFallback = resolvedCat.is_hidden
    } else if (item.category?.name) {
      key = `cat_${item.category.id || item.category_id || 'unknown'}`
      name = item.category.name
      sortOrder = (item.category.sort_order ?? 99) * 10
    } else if (item.product?.category?.name) {
      key = `cat_${item.product.category.id || 'unknown'}`
      name = item.product.category.name
      sortOrder = (item.product.category.sort_order ?? 99) * 10
    } else {
      key = 'other'
      name = otherLabel
      sortOrder = 99999
    }

    const existing = aisleMap.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      aisleMap.set(key, {
        categoryId: resolvedCat ? resolvedCat.id : null,
        name,
        sort_order: sortOrder,
        is_hidden: isHidden,
        has_fallback_items: hasFallback,
        items: [item]
      })
    }
  })

  return Array.from(aisleMap.values()).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.name.localeCompare(b.name)
  })
}

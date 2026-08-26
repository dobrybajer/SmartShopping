import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCategoryStore } from '../useCategoryStore'
import { categoryService } from '@/services/categoryService'

vi.mock('@/services/categoryService', () => ({
  categoryService: {
    getCategoriesWithSettings: vi.fn(),
    createCustomCategory: vi.fn(),
    updateCustomCategory: vi.fn(),
    deleteCustomCategory: vi.fn(),
    batchUpsertCategorySettings: vi.fn(),
    toggleCategoryVisibility: vi.fn()
  }
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    removeChannel: vi.fn()
  }
}))

describe('useCategoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCategoryStore.setState({
      activeHouseholdId: 'hh-1',
      categoriesByHousehold: {
        'hh-1': [
          {
            id: 1,
            name: 'fruits_vegetables',
            is_global: true,
            household_id: null,
            sort_order: 10,
            is_hidden: false
          },
          {
            id: 2,
            name: 'bakery',
            is_global: true,
            household_id: null,
            sort_order: 20,
            is_hidden: false
          }
        ]
      },
      rawCategoriesByHousehold: {},
      settingsByHousehold: {},
      isLoading: false,
      error: null
    })
  })

  it('optimistically reorders categories and persists via debounced batch upsert', async () => {
    vi.useFakeTimers()
    vi.mocked(categoryService.batchUpsertCategorySettings).mockResolvedValue(true)

    // Move bakery (id: 2) to first position
    const reorderPromise = useCategoryStore.getState().reorderCategories('hh-1', [2, 1])

    // Immediately in store, order should be reversed
    const immediate = useCategoryStore.getState().categoriesByHousehold['hh-1']
    expect(immediate[0].id).toBe(2)
    expect(immediate[0].sort_order).toBe(10)
    expect(immediate[1].id).toBe(1)
    expect(immediate[1].sort_order).toBe(20)

    // Fast-forward debounce timer
    vi.advanceTimersByTime(450)
    const success = await reorderPromise

    expect(success).toBe(true)
    expect(categoryService.batchUpsertCategorySettings).toHaveBeenCalledWith('hh-1', [
      { category_id: 2, custom_sort_order: 10 },
      { category_id: 1, custom_sort_order: 20 }
    ])

    vi.useRealTimers()
  })

  it('rolls back optimistic reorder if backend update fails', async () => {
    vi.useFakeTimers()
    vi.mocked(categoryService.batchUpsertCategorySettings).mockResolvedValue(false)

    const reorderPromise = useCategoryStore.getState().reorderCategories('hh-1', [2, 1])

    // Advance debounce timer
    vi.advanceTimersByTime(450)
    const success = await reorderPromise

    expect(success).toBe(false)
    // Rolled back to original order: fruits_vegetables (1), bakery (2)
    const rolledBack = useCategoryStore.getState().categoriesByHousehold['hh-1']
    expect(rolledBack[0].id).toBe(1)
    expect(rolledBack[1].id).toBe(2)
    expect(useCategoryStore.getState().error).toBe('Failed to save aisle order')

    vi.useRealTimers()
  })

  it('toggles category visibility optimistically and rolls back on failure', async () => {
    vi.mocked(categoryService.toggleCategoryVisibility).mockResolvedValue(false)

    const success = await useCategoryStore.getState().toggleVisibility('hh-1', 1, true)

    expect(success).toBe(false)
    expect(categoryService.toggleCategoryVisibility).toHaveBeenCalledWith('hh-1', 1, true, 10)

    // Should rollback is_hidden to false
    const current = useCategoryStore.getState().categoriesByHousehold['hh-1']
    expect(current.find((c) => c.id === 1)?.is_hidden).toBe(false)
  })

  it('deletes custom category and rolls back on failure', async () => {
    vi.mocked(categoryService.deleteCustomCategory).mockResolvedValue(false)

    const success = await useCategoryStore.getState().deleteCustomCategory('hh-1', 2)

    expect(success).toBe(false)
    expect(categoryService.deleteCustomCategory).toHaveBeenCalledWith(2, 'hh-1')

    // Restored in store
    const categories = useCategoryStore.getState().categoriesByHousehold['hh-1']
    expect(categories).toHaveLength(2)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDaysIso,
  buildMealPlanInputsFromTemplate,
  buildWeeklyTemplateFromPlans,
  getCalendarFetchWindow,
  getMondayIso,
  loadStoredWeeklyTemplates,
  saveStoredWeeklyTemplates
} from '../weeklyTemplateCalculations'
import { isUuid } from '@/lib/utils'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { mealPlanService } from '@/services/mealPlanService'
import { weeklyTemplateService } from '@/services/weeklyTemplateService'
import type { MealPlanItem } from '@/types/calendar'

const SAMPLE_PLANS: MealPlanItem[] = [
  {
    id: 'plan-mon',
    household_id: 'hh-1',
    date: '2026-11-16', // Monday
    meal_id: 'meal-oats',
    meal_category_id: 1,
    custom_name: null,
    is_ad_hoc: false,
    servings: 2,
    target_kcal: 600,
    notes: 'Z owocami',
    sort_order: 0,
    is_uncertainty_dismissed: false,
    created_at: '2026-11-15T10:00:00Z',
    updated_at: '2026-11-15T10:00:00Z',
    meal: {
      id: 'meal-oats',
      household_id: 'hh-1',
      name: 'Owsianka białkowa',
      description: null,
      preparation_steps: null,
      comments: null,
      category_id: 1,
      tags: null,
      ingredients: []
    }
  },
  {
    id: 'plan-wed',
    household_id: 'hh-1',
    date: '2026-11-18', // Wednesday (day_offset = 2)
    meal_id: null,
    meal_category_id: 2,
    custom_name: 'Kurczak z ryżem',
    is_ad_hoc: true,
    servings: 1,
    target_kcal: 800,
    notes: null,
    sort_order: 1,
    is_uncertainty_dismissed: false,
    created_at: '2026-11-15T10:00:00Z',
    updated_at: '2026-11-15T10:00:00Z',
    meal: null
  }
]

describe('LOW-08: Weekly Meal Plan Templates Engine & Store Flows', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('Flow 01: computes Monday ISO and relative day offsets without UTC drift', () => {
    expect(getMondayIso('2026-11-18')).toBe('2026-11-16')
    expect(addDaysIso('2026-11-16', 2)).toBe('2026-11-18')
    expect(addDaysIso('2026-11-16', 6)).toBe('2026-11-22')
  })

  it('Flow 02: builds a named WeeklyMealTemplate from a week of planned meals', () => {
    const template = buildWeeklyTemplateFromPlans({
      name: 'Tydzień redukcyjny 2200 kcal',
      householdId: 'hh-1',
      weekStartMondayIso: '2026-11-16',
      plans: SAMPLE_PLANS,
      numDays: 7,
      id: 'tpl-1'
    })

    expect(template).not.toBeNull()
    expect(template?.name).toBe('Tydzień redukcyjny 2200 kcal')
    expect(template?.entries).toHaveLength(2)
    expect(template?.entries[0]).toMatchObject({
      day_offset: 0,
      meal_id: 'meal-oats',
      meal_name: 'Owsianka białkowa',
      servings: 2,
      target_kcal: 600
    })
    expect(template?.entries[1]).toMatchObject({
      day_offset: 2,
      custom_name: 'Kurczak z ryżem',
      is_ad_hoc: true,
      servings: 1,
      target_kcal: 800
    })
  })

  it('Flow 03: applies template to a future week with automatic portion & kcal scaling and duplicate skipping', () => {
    const template = buildWeeklyTemplateFromPlans({
      name: 'Szybki tydzień pracujący',
      householdId: 'hh-1',
      weekStartMondayIso: '2026-11-16',
      plans: SAMPLE_PLANS
    })!

    const inputs = buildMealPlanInputsFromTemplate({
      template,
      targetMondayIso: '2026-11-23', // Next Monday
      householdId: 'hh-1',
      servingsMultiplier: 1.5
    })

    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toMatchObject({
      date: '2026-11-23',
      meal_id: 'meal-oats',
      servings: 3, // 2 * 1.5
      target_kcal: 900 // 600 * 1.5
    })
    expect(inputs[1]).toMatchObject({
      date: '2026-11-25', // 2026-11-23 + 2 days
      custom_name: 'Kurczak z ryżem',
      servings: 1.5,
      target_kcal: 1200
    })
  })

  it('Flow 04: persists templates per household and applies them in batch via useMealPlanStore', async () => {
    const createBatchSpy = vi
      .spyOn(mealPlanService, 'createMealPlansBatch')
      .mockImplementation(async (inputs) =>
        inputs.map((input, idx) => ({
          id: `created_${input.date}_${idx}`,
          household_id: input.household_id,
          date: input.date,
          meal_id: input.meal_id || null,
          meal_category_id: input.meal_category_id || null,
          custom_name: input.custom_name || null,
          is_ad_hoc: input.is_ad_hoc ?? false,
          servings: input.servings ?? 1,
          target_kcal: input.target_kcal ?? null,
          notes: input.notes || null,
          sort_order: input.sort_order ?? 0,
          is_uncertainty_dismissed: false,
          created_at: '2026-11-15T12:00:00Z',
          updated_at: '2026-11-15T12:00:00Z',
          meal: null
        }))
      )
    const saveRemoteSpy = vi
      .spyOn(weeklyTemplateService, 'saveWeeklyTemplate')
      .mockImplementation(async (tpl) => tpl)
    const deleteRemoteSpy = vi
      .spyOn(weeklyTemplateService, 'deleteWeeklyTemplate')
      .mockResolvedValue(true)

    useMealPlanStore.setState({
      activeHouseholdId: 'hh-1',
      mealPlans: SAMPLE_PLANS,
      weeklyTemplates: []
    })

    const saved = useMealPlanStore
      .getState()
      .saveWeekAsTemplate('Szablon Domowy', '2026-11-16', 7)

    expect(saved).not.toBeNull()
    expect(isUuid(saved!.id)).toBe(true)
    expect(loadStoredWeeklyTemplates('hh-1')).toHaveLength(1)
    expect(saveRemoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Szablon Domowy' }))

    const appliedCount = await useMealPlanStore
      .getState()
      .applyWeeklyTemplate(saved!.id, '2026-11-30', { servingsMultiplier: 2 })

    expect(appliedCount).toBe(2)
    expect(createBatchSpy).toHaveBeenCalledTimes(1)
    expect(useMealPlanStore.getState().mealPlans).toHaveLength(4)

    useMealPlanStore.getState().deleteWeeklyTemplate(saved!.id)
    expect(useMealPlanStore.getState().weeklyTemplates).toHaveLength(0)
    expect(deleteRemoteSpy).toHaveBeenCalledWith(saved!.id, 'hh-1')

    saveStoredWeeklyTemplates('hh-2', [])
    expect(loadStoredWeeklyTemplates('hh-2')).toEqual([])

    const fetchWin = getCalendarFetchWindow('2026-10-15')
    expect(fetchWin).toEqual({ startDate: '2026-09-24', endDate: '2026-11-07' })
  })
})

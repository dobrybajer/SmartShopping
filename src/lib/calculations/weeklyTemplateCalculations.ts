import type {
  CreateCalendarMealInput,
  MealPlanItem,
  WeeklyMealTemplate,
  WeeklyTemplateEntry
} from '@/types/calendar'

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight (00:00:00).
 */
function parseLocalIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/**
 * Formats a local Date into YYYY-MM-DD.
 */
export function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the Monday YYYY-MM-DD of the week containing `dateStr`.
 */
export function getMondayIso(dateStr: string): string {
  const d = parseLocalIsoDate(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return formatLocalIsoDate(d)
}

/**
 * Adds `days` calendar days to `dateStr` (YYYY-MM-DD) in local time.
 */
export function addDaysIso(dateStr: string, days: number): string {
  const d = parseLocalIsoDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatLocalIsoDate(d)
}

/**
 * Generates an RFC-4122 UUID v4 suitable for client-side optimistic creation of DB-synced records.
 */
export function generateUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Computes a bounded [startDate, endDate] calendar fetch window covering the full month
 * of `centerDateISO` plus `bufferDays` padding on each side (for 6-row month grid bleed & adjacent weeks).
 */
export function getCalendarFetchWindow(
  centerDateISO: string,
  bufferDays = 7
): { startDate: string; endDate: string } {
  const anchor = parseLocalIsoDate(centerDateISO)
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  return {
    startDate: addDaysIso(formatLocalIsoDate(firstOfMonth), -Math.max(0, bufferDays)),
    endDate: addDaysIso(formatLocalIsoDate(lastOfMonth), Math.max(0, bufferDays))
  }
}

export interface BuildWeeklyTemplateParams {
  name: string
  householdId: string
  weekStartMondayIso: string
  plans: MealPlanItem[]
  numDays?: 5 | 7
  id?: string
  createdAt?: string
}

const WEEKLY_TEMPLATES_STORAGE_KEY = 'smartshopping_weekly_meal_templates'

export function loadStoredWeeklyTemplates(householdId: string | null | undefined): WeeklyMealTemplate[] {
  if (!householdId || typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(WEEKLY_TEMPLATES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, WeeklyMealTemplate[]>
    const list = parsed?.[householdId]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveStoredWeeklyTemplates(
  householdId: string,
  templates: WeeklyMealTemplate[]
): void {
  if (!householdId || typeof window === 'undefined' || !window.localStorage) return
  try {
    const raw = window.localStorage.getItem(WEEKLY_TEMPLATES_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, WeeklyMealTemplate[]>) : {}
    parsed[householdId] = templates
    window.localStorage.setItem(WEEKLY_TEMPLATES_STORAGE_KEY, JSON.stringify(parsed))
  } catch (err) {
    console.warn('[weeklyTemplateCalculations] Failed to persist weekly templates:', err)
  }
}

/**
 * Extracts all planned meals within a week `[Monday .. Monday + numDays - 1]`
 * into a reusable `WeeklyMealTemplate` with relative `day_offset` (0..6).
 * Returns `null` if the name is empty or the week has no planned meals.
 */
export function buildWeeklyTemplateFromPlans({
  name,
  householdId,
  weekStartMondayIso,
  plans,
  numDays = 7,
  id,
  createdAt
}: BuildWeeklyTemplateParams): WeeklyMealTemplate | null {
  const trimmedName = name.trim()
  if (!trimmedName || !householdId) return null

  const mondayIso = getMondayIso(weekStartMondayIso)
  const dateToOffset = new Map<string, number>()
  for (let offset = 0; offset < numDays; offset++) {
    dateToOffset.set(addDaysIso(mondayIso, offset), offset)
  }

  const matchingPlans = plans
    .filter((p) => dateToOffset.has(p.date))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })

  if (matchingPlans.length === 0) return null

  const entries: WeeklyTemplateEntry[] = matchingPlans.map((plan) => ({
    day_offset: dateToOffset.get(plan.date) ?? 0,
    meal_id: plan.meal_id || null,
    meal_name: plan.meal?.name || plan.custom_name || null,
    meal_category_id: plan.meal_category_id ?? null,
    custom_name: plan.custom_name || null,
    is_ad_hoc: Boolean(plan.is_ad_hoc),
    servings: Number(plan.servings) || 1,
    target_kcal: plan.target_kcal ?? null,
    notes: plan.notes || null,
    sort_order: plan.sort_order ?? 0
  }))

  return {
    id: id || generateUuidV4(),
    household_id: householdId,
    name: trimmedName,
    created_at: createdAt || new Date().toISOString(),
    entries
  }
}

export interface BuildMealPlanInputsFromTemplateParams {
  template: WeeklyMealTemplate
  targetMondayIso: string
  householdId: string
  servingsMultiplier?: number
  existingPlansForWeek?: MealPlanItem[]
  skipDuplicates?: boolean
}

/**
 * Generates `CreateCalendarMealInput[]` for applying a `WeeklyMealTemplate` onto a target week,
 * scaling servings and optional target_kcal by `servingsMultiplier`.
 */
export function buildMealPlanInputsFromTemplate({
  template,
  targetMondayIso,
  householdId,
  servingsMultiplier = 1,
  existingPlansForWeek = [],
  skipDuplicates = true
}: BuildMealPlanInputsFromTemplateParams): CreateCalendarMealInput[] {
  const safeMultiplier =
    Number.isFinite(servingsMultiplier) && servingsMultiplier > 0 ? servingsMultiplier : 1
  const mondayIso = getMondayIso(targetMondayIso)

  const results: CreateCalendarMealInput[] = []

  for (const entry of template.entries) {
    const targetDate = addDaysIso(mondayIso, entry.day_offset)

    if (skipDuplicates && existingPlansForWeek.length > 0) {
      const isDuplicate = existingPlansForWeek.some(
        (existing) =>
          existing.date === targetDate &&
          (existing.meal_category_id ?? null) === (entry.meal_category_id ?? null) &&
          ((entry.meal_id && existing.meal_id === entry.meal_id) ||
            (!entry.meal_id &&
              entry.custom_name &&
              (existing.custom_name || '').toLowerCase() === entry.custom_name.toLowerCase()))
      )
      if (isDuplicate) continue
    }

    const scaledServings = Math.max(0.5, Math.round(entry.servings * safeMultiplier * 10) / 10)
    const scaledTargetKcal =
      entry.target_kcal && entry.target_kcal > 0
        ? Math.round(entry.target_kcal * safeMultiplier)
        : null

    results.push({
      household_id: householdId,
      date: targetDate,
      meal_id: entry.meal_id,
      meal_category_id: entry.meal_category_id,
      custom_name: entry.custom_name,
      is_ad_hoc: entry.is_ad_hoc,
      servings: scaledServings,
      target_kcal: scaledTargetKcal,
      notes: entry.notes,
      sort_order: entry.sort_order
    })
  }

  return results
}

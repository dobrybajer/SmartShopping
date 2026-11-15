import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(val?: string | null): val is string {
  return !!val && UUID_REGEX.test(val)
}

/**
 * Formats a date string, ISO timestamp, or Date object into DD.MM.YYYY format
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''

  try {
    // If it's YYYY-MM-DD format, parse year, month, day directly to avoid timezone shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-')
      return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return String(dateInput)

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}.${month}.${year}`
  } catch {
    return String(dateInput)
  }
}

/**
 * Formats a date string, ISO timestamp, or Date object into HH:mm format (24h)
 */
export function formatTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return ''

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * Returns the step for incrementing/decrementing a quantity based on the unit type.
 * For 'pcs' or unknown: step is 1.
 * For 'g' and 'ml': step is 100.
 */
export function getUnitStep(unit?: string | null): number {
  if (!unit) return 1
  const u = unit.toLowerCase().trim()
  if (u === 'g' || u === 'ml') {
    return 100
  }
  return 1
}

/**
 * Calculates the next quantity value given the current quantity, unit, and direction.
 */
export function getNextQuantity(
  current: number,
  unit: string | null | undefined,
  direction: 'increase' | 'decrease'
): number {
  const step = getUnitStep(unit)
  const delta = direction === 'increase' ? step : -step
  return Math.round((current + delta) * 100) / 100
}

/**
 * Sanitizes inline decimal quantity input: normalizes commas to dots,
 * permits at most one decimal point, and strips leading zeros before non-fractional digits.
 */
export function sanitizePositiveDecimalInput(raw: string): string {
  let cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  }
  if (cleaned.startsWith('.')) {
    cleaned = `0${cleaned}`
  }
  return cleaned.replace(/^0+(?=\d)/, '')
}

/**
 * Parses an edited quantity string into a positive rounded decimal (up to 2 decimal places),
 * returning null if empty, non-finite, or <= 0.
 */
export function parsePositiveDecimalQuantity(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  const rounded = Math.round(parsed * 100) / 100
  return rounded > 0 ? rounded : null
}

/**
 * Returns the local date in YYYY-MM-DD format (avoids UTC timezone shift of toISOString)
 */
export function getLocalDateISOString(dateInput?: Date): string {
  const d = dateInput || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatLocalDateISO = getLocalDateISOString

/**
 * Shifts a YYYY-MM-DD ISO date string by `deltaDays` in local calendar time,
 * avoiding UTC conversion timezone shifts around midnight.
 */
export function addDaysISO(isoDate: string, deltaDays: number): string {
  const parts = isoDate.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    return getLocalDateISOString()
  }
  const [y, m, d] = parts
  const dt = new Date(y, m - 1, d + deltaDays)
  return getLocalDateISOString(dt)
}


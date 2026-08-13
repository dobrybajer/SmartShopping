import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Returns the local date in YYYY-MM-DD format (avoids UTC timezone shift of toISOString)
 */
export function getLocalDateISOString(dateInput?: Date): string {
  const d = dateInput || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


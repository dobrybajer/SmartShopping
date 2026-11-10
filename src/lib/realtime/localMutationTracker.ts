/**
 * Tracks recent local mutations to suppress Supabase Realtime WebSocket echoes
 * (preventing double haptic vibrations and redundant full-list GET refetches on the sender device).
 */

export interface LocalItemPatch {
  is_checked?: boolean
  total_quantity?: number
  in_pantry?: boolean
}

interface TrackedEntry<T> {
  timestamp: number
  patch?: T
}

export const DEFAULT_ECHO_TTL_MS = 2500

const recentItemMutations = new Map<string, TrackedEntry<LocalItemPatch>>()
const recentListMutations = new Map<string, TrackedEntry<undefined>>()

function pruneExpired<T>(map: Map<string, TrackedEntry<T>>, ttlMs: number, now: number) {
  for (const [key, entry] of map.entries()) {
    if (now - entry.timestamp > ttlMs) {
      map.delete(key)
    }
  }
}

export function trackLocalItemMutation(
  itemId: string,
  patch?: LocalItemPatch,
  now = Date.now()
): void {
  if (!itemId) return
  pruneExpired(recentItemMutations, DEFAULT_ECHO_TTL_MS, now)
  const existing = recentItemMutations.get(itemId)
  recentItemMutations.set(itemId, {
    timestamp: now,
    patch: existing?.patch || patch ? { ...existing?.patch, ...patch } : undefined
  })
}

export function isLocalItemEcho(
  itemId: string | undefined | null,
  incomingRow?: Record<string, unknown> | null,
  ttlMs = DEFAULT_ECHO_TTL_MS,
  now = Date.now()
): boolean {
  if (!itemId) return false
  const entry = recentItemMutations.get(itemId)
  if (!entry) return false
  if (now - entry.timestamp > ttlMs) {
    recentItemMutations.delete(itemId)
    return false
  }

  // If we recorded expected field values and incoming row carries them, verify they match
  // so that a concurrent mutation by a partner to a DIFFERENT value is never suppressed.
  if (entry.patch && incomingRow) {
    if (
      entry.patch.is_checked !== undefined &&
      incomingRow.is_checked !== undefined &&
      Boolean(incomingRow.is_checked) !== entry.patch.is_checked
    ) {
      return false
    }
    if (
      entry.patch.total_quantity !== undefined &&
      incomingRow.total_quantity !== undefined &&
      Number(incomingRow.total_quantity) !== entry.patch.total_quantity
    ) {
      return false
    }
    if (
      entry.patch.in_pantry !== undefined &&
      incomingRow.in_pantry !== undefined &&
      Boolean(incomingRow.in_pantry) !== entry.patch.in_pantry
    ) {
      return false
    }
  }

  return true
}

export function trackLocalListMutation(listId: string, now = Date.now()): void {
  if (!listId) return
  pruneExpired(recentListMutations, DEFAULT_ECHO_TTL_MS, now)
  recentListMutations.set(listId, { timestamp: now })
}

export function isLocalListEcho(
  listId: string | undefined | null,
  ttlMs = DEFAULT_ECHO_TTL_MS,
  now = Date.now()
): boolean {
  if (!listId) return false
  const entry = recentListMutations.get(listId)
  if (!entry) return false
  if (now - entry.timestamp > ttlMs) {
    recentListMutations.delete(listId)
    return false
  }
  return true
}

export function clearLocalMutationTracker(): void {
  recentItemMutations.clear()
  recentListMutations.clear()
}


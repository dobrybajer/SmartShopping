/**
 * Offline Mutation Queue & Background Sync (CRIT-01)
 *
 * Persists pending mutations to localStorage so that users can continue
 * ticking off groceries in underground markets with zero cellular connectivity.
 * When connectivity is restored, pending mutations are flushed sequentially to Supabase.
 */

export type OfflineMutationType = 'TOGGLE_ITEM_CHECK' | 'UPDATE_ITEM_QUANTITY'

export interface OfflineMutation {
  id: string
  type: OfflineMutationType
  itemId: string
  payload: {
    isChecked?: boolean
    quantity?: number
  }
  timestamp: string
  retryCount: number
}

const STORAGE_KEY = 'smartshopping_offline_mutation_queue'

type StatusListener = (pendingCount: number) => void
const statusListeners = new Set<StatusListener>()

function notifyListeners() {
  const count = getPendingMutations().length
  statusListeners.forEach((listener) => {
    try {
      listener(count)
    } catch {
      // Ignore listener error
    }
  })
}

export function subscribeToQueueStatus(listener: StatusListener): () => void {
  statusListeners.add(listener)
  listener(getPendingMutations().length)
  return () => {
    statusListeners.delete(listener)
  }
}

export function getPendingMutations(): OfflineMutation[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OfflineMutation[]
  } catch (e) {
    console.error('[offlineMutationQueue] Error reading from localStorage:', e)
    return []
  }
}

function savePendingMutations(mutations: OfflineMutation[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    if (mutations.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mutations))
    }
  } catch (e) {
    console.error('[offlineMutationQueue] Error writing to localStorage:', e)
  }
  notifyListeners()
}

/**
 * Enqueues or merges a mutation in the offline queue.
 * If a mutation for the same item and type exists, it is collapsed/updated to the latest target state.
 */
export function enqueueMutation(
  type: OfflineMutationType,
  itemId: string,
  payload: { isChecked?: boolean; quantity?: number }
): OfflineMutation {
  const mutations = getPendingMutations()
  const nowIso = new Date().toISOString()

  const existingIndex = mutations.findIndex((m) => m.itemId === itemId && m.type === type)

  let mutation: OfflineMutation
  if (existingIndex >= 0) {
    mutation = {
      ...mutations[existingIndex],
      payload: { ...mutations[existingIndex].payload, ...payload },
      timestamp: nowIso
    }
    mutations[existingIndex] = mutation
  } else {
    mutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      itemId,
      payload,
      timestamp: nowIso,
      retryCount: 0
    }
    mutations.push(mutation)
  }

  savePendingMutations(mutations)
  return mutation
}

export function removeMutation(mutationId: string): void {
  const mutations = getPendingMutations().filter((m) => m.id !== mutationId)
  savePendingMutations(mutations)
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.removeItem(STORAGE_KEY)
  notifyListeners()
}

export function hasPendingMutations(): boolean {
  return getPendingMutations().length > 0
}

let isFlushing = false

/**
 * Iterates through pending mutations and calls syncExecutor for each.
 * Halts if executor returns false or throws a network error.
 */
export async function flushOfflineQueue(
  syncExecutor: (mutation: OfflineMutation) => Promise<boolean>
): Promise<{ processed: number; remaining: number }> {
  if (isFlushing) {
    return { processed: 0, remaining: getPendingMutations().length }
  }

  isFlushing = true
  let processed = 0

  try {
    const mutations = [...getPendingMutations()]

    for (const mutation of mutations) {
      // Check if browser is marked offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break
      }

      try {
        const success = await syncExecutor(mutation)
        if (success) {
          removeMutation(mutation.id)
          processed++
        } else {
          // Increment retry count
          const current = getPendingMutations().map((m) =>
            m.id === mutation.id ? { ...m, retryCount: m.retryCount + 1 } : m
          )
          savePendingMutations(current)
          // Break to prevent spamming if server is rejecting or down
          break
        }
      } catch (err) {
        console.warn(`[offlineMutationQueue] Sync failed for mutation ${mutation.id}:`, err)
        break
      }
    }
  } finally {
    isFlushing = false
  }

  return { processed, remaining: getPendingMutations().length }
}

/**
 * Initializes automatic background synchronization when window comes back online.
 */
export function initOfflineQueueAutoSync(
  syncExecutor: (mutation: OfflineMutation) => Promise<boolean>
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => {
    console.log('[offlineMutationQueue] Connection restored. Flushing offline mutation queue...')
    flushOfflineQueue(syncExecutor).catch((err) => {
      console.error('[offlineMutationQueue] Error flushing queue on reconnect:', err)
    })
  }

  window.addEventListener('online', handleOnline)

  // Also check if there are pending items immediately on init if currently online
  if (typeof navigator !== 'undefined' && navigator.onLine && hasPendingMutations()) {
    handleOnline()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}

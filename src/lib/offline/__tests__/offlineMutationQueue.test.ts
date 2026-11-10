import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  enqueueMutation,
  getPendingMutations,
  removeMutation,
  clearOfflineQueue,
  hasPendingMutations,
  flushOfflineQueue,
  initOfflineQueueAutoSync
} from '../offlineMutationQueue'

describe('offlineMutationQueue - Resilience & Background Sync (CRIT-01)', () => {
  beforeEach(() => {
    clearOfflineQueue()
    vi.restoreAllMocks()
  })

  it('enqueues mutations into localStorage and reads them back', () => {
    expect(hasPendingMutations()).toBe(false)

    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-101', { isChecked: true })
    enqueueMutation('UPDATE_ITEM_QUANTITY', 'item-102', { quantity: 3 })

    const pending = getPendingMutations()
    expect(pending.length).toBe(2)
    expect(pending[0].itemId).toBe('item-101')
    expect(pending[0].payload.isChecked).toBe(true)
    expect(pending[1].itemId).toBe('item-102')
    expect(pending[1].payload.quantity).toBe(3)
    expect(hasPendingMutations()).toBe(true)
  })

  it('deduplicates and collapses multiple mutations for the same item', () => {
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-101', { isChecked: true })
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-101', { isChecked: false })

    const pending = getPendingMutations()
    expect(pending.length).toBe(1)
    expect(pending[0].itemId).toBe('item-101')
    expect(pending[0].payload.isChecked).toBe(false)
  })

  it('removes single mutation by ID', () => {
    const m1 = enqueueMutation('TOGGLE_ITEM_CHECK', 'item-1', { isChecked: true })
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-2', { isChecked: true })

    expect(getPendingMutations().length).toBe(2)
    removeMutation(m1.id)

    const pending = getPendingMutations()
    expect(pending.length).toBe(1)
    expect(pending[0].itemId).toBe('item-2')
  })

  it('flushes queue sequentially and removes successful mutations', async () => {
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-1', { isChecked: true })
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-2', { isChecked: false })

    const executed: string[] = []
    const mockExecutor = vi.fn().mockImplementation(async (mutation) => {
      executed.push(mutation.itemId)
      return true
    })

    const result = await flushOfflineQueue(mockExecutor)
    expect(result.processed).toBe(2)
    expect(result.remaining).toBe(0)
    expect(executed).toEqual(['item-1', 'item-2'])
    expect(hasPendingMutations()).toBe(false)
  })

  it('stops processing on error and increments retryCount without losing pending items', async () => {
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-1', { isChecked: true })
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-2', { isChecked: true })

    const mockExecutor = vi.fn().mockImplementation(async (mutation) => {
      if (mutation.itemId === 'item-1') return true
      return false // Second mutation fails (e.g. server error)
    })

    const result = await flushOfflineQueue(mockExecutor)
    expect(result.processed).toBe(1)
    expect(result.remaining).toBe(1)

    const remaining = getPendingMutations()
    expect(remaining.length).toBe(1)
    expect(remaining[0].itemId).toBe('item-2')
    expect(remaining[0].retryCount).toBe(1)
  })

  it('triggers flush on online window event', async () => {
    enqueueMutation('TOGGLE_ITEM_CHECK', 'item-99', { isChecked: true })

    const mockExecutor = vi.fn().mockResolvedValue(true)
    const cleanup = initOfflineQueueAutoSync(mockExecutor)

    // Simulate online event
    window.dispatchEvent(new Event('online'))

    // Allow promise tick
    await new Promise((r) => setTimeout(r, 10))

    expect(mockExecutor).toHaveBeenCalled()
    expect(hasPendingMutations()).toBe(false)

    cleanup()
  })
})

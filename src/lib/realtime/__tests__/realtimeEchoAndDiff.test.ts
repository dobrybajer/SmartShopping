import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.unmock('@/hooks/useActiveListRealtime')

import {
  trackLocalItemMutation,
  isLocalItemEcho,
  trackLocalListMutation,
  isLocalListEcho,
  clearLocalMutationTracker
} from '../localMutationTracker'
import {
  applyActiveListItemUpdate,
  applyActiveListItemDelete
} from '../activeListDiff'
import {
  useActiveListRealtime,
  processShoppingListItemRealtimeEvent,
  processShoppingListRealtimeEvent
} from '@/hooks/useActiveListRealtime'
import { supabase } from '@/lib/supabase'
import type { ActiveListWithDetails, ShoppingListSummary } from '@/services/shoppingListService'

describe('HIGH-06: Realtime Echo Suppression, Single Vibration & Diff Updates', () => {
  beforeEach(() => {
    clearLocalMutationTracker()
    vi.restoreAllMocks()
    vi.spyOn(navigator, 'vibrate').mockReturnValue(true)
  })

  const sampleList: ActiveListWithDetails = {
    id: 'list-1',
    household_id: 'hh-1',
    name: 'Zakupy',
    original_name: null,
    status: 'active',
    is_default: true,
    target_date: null,
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T10:00:00Z',
    completed_at: null,
    preset_tags: null,
    items: [
      {
        id: 'item-1',
        shopping_list_id: 'list-1',
        product_id: 'prod-1',
        total_quantity: 2,
        is_checked: false,
        added_ad_hoc: false,
        in_pantry: false,
        category_id: 1,
        updated_at: '2026-10-26T10:00:00Z',
        product: {
          id: 'prod-1',
          name: 'Mleko',
          unit_type: 'pcs',
          category_id: 1
        }
      },
      {
        id: 'item-2',
        shopping_list_id: 'list-1',
        product_id: 'prod-2',
        total_quantity: 1,
        is_checked: false,
        added_ad_hoc: false,
        in_pantry: false,
        category_id: 2,
        updated_at: '2026-10-26T10:00:00Z',
        product: {
          id: 'prod-2',
          name: 'Chleb',
          unit_type: 'pcs',
          category_id: 2
        }
      }
    ]
  }

  const sampleSummaries: ShoppingListSummary[] = [
    {
      id: 'list-1',
      household_id: 'hh-1',
      name: 'Zakupy',
      status: 'active',
      is_default: true,
      target_date: null,
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:00:00Z',
      total_items: 2,
      unchecked_items: 2
    }
  ]

  it('suppresses vibration and full refetch when WebSocket echoes a locally toggled item', () => {
    const onRefreshRequired = vi.fn()
    const onItemUpdated = vi.fn()

    // User toggles item-1 locally
    trackLocalItemMutation('item-1', { is_checked: true })

    // Returning echo from Supabase Realtime
    processShoppingListItemRealtimeEvent(
      {
        eventType: 'UPDATE',
        new: {
          id: 'item-1',
          is_checked: true,
          total_quantity: 2,
          updated_at: '2026-10-26T10:05:00Z'
        }
      },
      { onRefreshRequired, onItemUpdated }
    )

    // Vibration must NOT trigger a second time, and full refresh must NOT fire
    expect(navigator.vibrate).not.toHaveBeenCalled()
    expect(onRefreshRequired).not.toHaveBeenCalled()
    // Silently syncs updated_at via diff callback
    expect(onItemUpdated).toHaveBeenCalledTimes(1)
  })

  it('triggers haptic vibration and single-item diff (without full refresh) when a partner toggles an item remotely', () => {
    const onRefreshRequired = vi.fn()
    const onItemUpdated = vi.fn()

    // Partner toggles item-2 remotely (NOT tracked locally)
    processShoppingListItemRealtimeEvent(
      {
        eventType: 'UPDATE',
        new: {
          id: 'item-2',
          is_checked: true,
          total_quantity: 1,
          updated_at: '2026-10-26T10:06:00Z'
        }
      },
      { onRefreshRequired, onItemUpdated }
    )

    expect(navigator.vibrate).toHaveBeenCalledWith([25, 40, 25])
    expect(onRefreshRequired).not.toHaveBeenCalled()
    expect(onItemUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-2', is_checked: true })
    )
  })

  it('does NOT suppress partner concurrent update on the same item if value differs from local patch', () => {
    trackLocalItemMutation('item-1', { total_quantity: 3 })

    expect(
      isLocalItemEcho('item-1', { id: 'item-1', total_quantity: 3 })
    ).toBe(true)
    expect(
      isLocalItemEcho('item-1', { id: 'item-1', total_quantity: 5 })
    ).toBe(false)
  })

  it('expires local echo tracking after TTL window', () => {
    const t0 = 10000
    trackLocalItemMutation('item-1', { is_checked: true }, t0)
    trackLocalListMutation('list-1', t0)

    expect(isLocalItemEcho('item-1', { is_checked: true }, 2000, t0 + 1000)).toBe(true)
    expect(isLocalItemEcho('item-1', { is_checked: true }, 2000, t0 + 2500)).toBe(false)

    expect(isLocalListEcho('list-1', 2000, t0 + 1000)).toBe(true)
    expect(isLocalListEcho('list-1', 2000, t0 + 2500)).toBe(false)
  })

  it('suppresses shopping_lists echo vibration and refetch for local list changes', () => {
    const onRefreshRequired = vi.fn()
    trackLocalListMutation('list-1')

    processShoppingListRealtimeEvent(
      { eventType: 'UPDATE', new: { id: 'list-1' } },
      { onRefreshRequired }
    )

    expect(navigator.vibrate).not.toHaveBeenCalled()
    expect(onRefreshRequired).not.toHaveBeenCalled()

    // Remote list change triggers vibration and refresh
    processShoppingListRealtimeEvent(
      { eventType: 'UPDATE', new: { id: 'list-2' } },
      { onRefreshRequired }
    )
    expect(navigator.vibrate).toHaveBeenCalledWith([25, 40, 25])
    expect(onRefreshRequired).toHaveBeenCalledTimes(1)
  })

  it('applyActiveListItemUpdate applies single-item diff with OCC and updates summary counts locally', () => {
    const res = applyActiveListItemUpdate(
      sampleList,
      {
        id: 'item-1',
        is_checked: true,
        total_quantity: 4,
        updated_at: '2026-10-26T10:10:00Z'
      },
      sampleSummaries
    )

    expect(res.needsFullRefresh).toBe(false)
    expect(res.nextList?.items[0].is_checked).toBe(true)
    expect(res.nextList?.items[0].total_quantity).toBe(4)
    expect(res.nextSummaries?.[0].unchecked_items).toBe(1)
  })

  it('applyActiveListItemDelete removes item in-place and updates summary counts', () => {
    const res = applyActiveListItemDelete(sampleList, 'item-2', sampleSummaries)
    expect(res.nextList?.items).toHaveLength(1)
    expect(res.nextSummaries?.[0].total_items).toBe(1)
    expect(res.nextSummaries?.[0].unchecked_items).toBe(1)
  })

  it('useActiveListRealtime hook suppresses local checkbox echo via Supabase channel and processes remote partner updates', () => {
    const handlers: Array<{ table: string; cb: (payload: unknown) => void }> = []
    interface MockChannel {
      on: (_type: unknown, filter: { table: string }, cb: (payload: unknown) => void) => MockChannel
      subscribe: (cb?: (status: string) => void) => MockChannel
    }
    const mockChannel: MockChannel = {
      on: vi.fn((_type: unknown, filter: { table: string }, cb: (payload: unknown) => void) => {
        handlers.push({ table: filter.table, cb })
        return mockChannel
      }),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        cb?.('SUBSCRIBED')
        return mockChannel
      })
    }
    vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel as never)
    vi.spyOn(supabase, 'removeChannel').mockResolvedValue('ok' as never)

    const onRefreshRequired = vi.fn()
    const onItemUpdated = vi.fn()

    const { unmount } = renderHook(() =>
      useActiveListRealtime('hh-1', 'list-1', {
        onRefreshRequired,
        onItemUpdated
      })
    )

    const itemSub = handlers.find((h) => h.table === 'shopping_list_items')
    expect(itemSub).toBeDefined()

    // 1. Local echo -> 0 vibrations, 0 full refetches
    trackLocalItemMutation('item-1', { is_checked: true })
    itemSub!.cb({
      eventType: 'UPDATE',
      new: { id: 'item-1', is_checked: true, updated_at: '2026-10-26T10:15:00Z' }
    })
    expect(navigator.vibrate).not.toHaveBeenCalled()
    expect(onRefreshRequired).not.toHaveBeenCalled()

    // 2. Remote partner update -> 1 vibration + single-item diff (still 0 full refetches)
    itemSub!.cb({
      eventType: 'UPDATE',
      new: { id: 'item-2', is_checked: true, updated_at: '2026-10-26T10:16:00Z' }
    })
    expect(navigator.vibrate).toHaveBeenCalledTimes(1)
    expect(navigator.vibrate).toHaveBeenCalledWith([25, 40, 25])
    expect(onRefreshRequired).not.toHaveBeenCalled()
    expect(onItemUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-2', is_checked: true })
    )

    unmount()
  })
})

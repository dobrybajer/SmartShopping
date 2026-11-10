import { describe, it, expect } from 'vitest'
import { resolveShoppingItemConflict } from '../shoppingItemConflict'

describe('shoppingItemConflict - Concurrency & OCC Resolution (CRIT-02)', () => {
  it('keeps item checked if current state is checked and delayed incoming is unchecked', () => {
    const current = {
      id: 'item-1',
      is_checked: true,
      updated_at: '2026-10-26T12:05:00Z',
      total_quantity: 2
    }
    const incomingDelayed = {
      id: 'item-1',
      is_checked: false,
      updated_at: '2026-10-26T12:00:00Z',
      total_quantity: 2
    }

    const resolved = resolveShoppingItemConflict(current, incomingDelayed)
    expect(resolved.is_checked).toBe(true)
    expect(resolved.updated_at).toBe('2026-10-26T12:05:00Z')
  })

  it('sets item checked if incoming server state is checked even if current client was unchecked', () => {
    const current = {
      id: 'item-2',
      is_checked: false,
      updated_at: '2026-10-26T12:00:00Z',
      total_quantity: 1
    }
    const incomingChecked = {
      id: 'item-2',
      is_checked: true,
      updated_at: '2026-10-26T12:03:00Z',
      total_quantity: 1
    }

    const resolved = resolveShoppingItemConflict(current, incomingChecked)
    expect(resolved.is_checked).toBe(true)
    expect(resolved.updated_at).toBe('2026-10-26T12:03:00Z')
  })

  it('keeps item unchecked only when both client and server are unchecked', () => {
    const current = {
      id: 'item-3',
      is_checked: false,
      updated_at: '2026-10-26T12:00:00Z',
      total_quantity: 5
    }
    const incoming = {
      id: 'item-3',
      is_checked: false,
      updated_at: '2026-10-26T12:02:00Z',
      total_quantity: 5
    }

    const resolved = resolveShoppingItemConflict(current, incoming)
    expect(resolved.is_checked).toBe(false)
    expect(resolved.updated_at).toBe('2026-10-26T12:02:00Z')
  })

  it('adopts latest non-checked properties (e.g. quantity) based on newer timestamp while preserving checked state', () => {
    const current = {
      id: 'item-4',
      is_checked: true,
      updated_at: '2026-10-26T12:01:00Z',
      total_quantity: 2
    }
    const incomingNewerQuantity = {
      id: 'item-4',
      is_checked: false,
      updated_at: '2026-10-26T12:04:00Z',
      total_quantity: 4
    }

    const resolved = resolveShoppingItemConflict(current, incomingNewerQuantity)
    expect(resolved.is_checked).toBe(true)
    expect(resolved.total_quantity).toBe(4)
  })
})

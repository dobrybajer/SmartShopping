import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shoppingListService } from '../shoppingListService'
import { supabase } from '@/lib/supabase'
import { notificationService } from '../notificationService'
import { pantryService } from '../pantryService'

describe('shoppingListService - archiveActiveList (MED-06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'ania@example.com',
          user_metadata: { name: 'Ania' }
        }
      },
      error: null
    } as never)
  })

  it('Flow 01: archives via atomic archive_shopping_list RPC and maps unchecked items to DraftItem[]', async () => {
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: {
        list_name: 'Zakupy na weekend',
        unchecked_items: [
          {
            id: 'archived_rem_item-2',
            product_id: 'prod-2',
            name: 'Mleko',
            unit_type: 'l',
            category_id: 2,
            category_name: 'Nabiał',
            sort_order: 2,
            quantity: 2,
            is_ad_hoc: false
          }
        ]
      },
      error: null
    } as never)

    const notifySpy = vi
      .spyOn(notificationService, 'notify')
      .mockResolvedValue({ success: true, sentCount: 1 })
    const fromSpy = vi.spyOn(supabase, 'from')

    const result = await shoppingListService.archiveActiveList('list-123', 'hh-123')

    expect(rpcSpy).toHaveBeenCalledWith('archive_shopping_list', {
      p_list_id: 'list-123',
      p_household_id: 'hh-123'
    })
    expect(fromSpy).not.toHaveBeenCalled()
    expect(notifySpy).toHaveBeenCalledWith(
      'LIST_CLEARED_OR_ARCHIVED',
      {
        listId: 'list-123',
        listName: 'Zakupy na weekend',
        clearedByName: 'Ania',
        action: 'archived'
      },
      'hh-123'
    )
    expect(result).toEqual([
      {
        id: 'archived_rem_item-2',
        product_id: 'prod-2',
        name: 'Mleko',
        unit_type: 'l',
        category_id: 2,
        category_name: 'Nabiał',
        sort_order: 2,
        quantity: 2,
        is_ad_hoc: false
      }
    ])
  })

  it('Flow 02: falls back to multi-query archival when RPC is unavailable (PGRST202)', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.archive_shopping_list' }
    } as never)

    vi.spyOn(notificationService, 'notify').mockResolvedValue({ success: true, sentCount: 1 })
    const ingestSpy = vi.spyOn(pantryService, 'batchIngestPurchasedItems').mockResolvedValue(true)

    const mockSelectChecked = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          total_quantity: 500,
          is_checked: true,
          in_pantry: false,
          added_ad_hoc: false,
          category_id: 1,
          product: { id: 'prod-1', name: 'Mąka', unit_type: 'g', category_id: 1 }
        }
      ]
    })

    const mockSelectUnchecked = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'item-2',
          product_id: 'prod-2',
          total_quantity: 3,
          is_checked: false,
          in_pantry: false,
          added_ad_hoc: true,
          category_id: 4,
          category: { id: 4, name: 'Warzywa', sort_order: 1 },
          product: { id: 'prod-2', name: 'Pomidor', unit_type: 'pcs', category_id: 4 }
        }
      ]
    })

    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'shopping_lists') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { name: 'Tygodniowa', original_name: null }
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        }
      }

      if (table === 'shopping_list_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: boolean) =>
                val ? mockSelectChecked() : mockSelectUnchecked()
              )
            })
          })
        }
      }

      return {}
    }) as never)

    const result = await shoppingListService.archiveActiveList('list-123', 'hh-123')

    expect(ingestSpy).toHaveBeenCalledWith('hh-123', [
      {
        product_id: 'prod-1',
        ad_hoc_name: null,
        quantity: 500,
        unit_type: 'g',
        category_id: 1
      }
    ])
    expect(result).toEqual([
      {
        id: 'archived_rem_item-2',
        product_id: 'prod-2',
        name: 'Pomidor',
        unit_type: 'pcs',
        category_id: 4,
        category_name: 'Warzywa',
        sort_order: 1,
        quantity: 3,
        is_ad_hoc: true
      }
    ])
  })

  it('Flow 03: does NOT run fallback when RPC rejects with authorization error', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { message: 'Forbidden: User is not a member of household' }
    } as never)

    const fromSpy = vi.spyOn(supabase, 'from')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await shoppingListService.archiveActiveList('list-123', 'foreign-hh')

    expect(fromSpy).not.toHaveBeenCalled()
    expect(result).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })

  it('Flow 04 (HIGH-09): getActiveListsSummary excludes in_pantry items from unchecked_items count', async () => {
    const orderMock2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'list-1',
          household_id: 'hh-123',
          name: 'Biedronka',
          status: 'active',
          is_default: true,
          target_date: null,
          created_at: '2026-11-10T10:00:00Z',
          updated_at: '2026-11-10T11:00:00Z',
          items: [
            { id: 'i1', is_checked: true, in_pantry: false },
            { id: 'i2', is_checked: false, in_pantry: true },
            { id: 'i3', is_checked: false, in_pantry: false }
          ]
        }
      ],
      error: null
    })
    const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 })
    const eqStatusMock = vi.fn().mockReturnValue({ order: orderMock1 })
    const eqHouseholdMock = vi.fn().mockReturnValue({ eq: eqStatusMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqHouseholdMock })

    vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as never)

    const summaries = await shoppingListService.getActiveListsSummary('hh-123')
    expect(summaries).toHaveLength(1)
    expect(summaries[0].total_items).toBe(3)
    expect(summaries[0].unchecked_items).toBe(1)
  })

  it('Flow 05 (HIGH-09): getHistoryLists and getListWithDetails fall back to archived_items_snapshot and shopping_list_items_archive', async () => {
    const historyOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'arch-list-1',
          household_id: 'hh-123',
          name: 'Stara Lista 2025',
          status: 'archived',
          is_default: false,
          target_date: null,
          created_at: '2025-05-01T10:00:00Z',
          updated_at: '2025-05-01T12:00:00Z',
          completed_at: '2025-05-01T12:00:00Z',
          items: [],
          archived_items_snapshot: {
            total_items: 2,
            checked_items: 2,
            items: [
              { product_id: 'prod-1', total_quantity: 1, is_checked: true },
              { product_id: 'prod-2', total_quantity: 2, is_checked: true }
            ]
          }
        }
      ],
      error: null
    })

    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'shopping_lists') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string) => {
              if (col === 'id') {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'arch-list-1',
                      household_id: 'hh-123',
                      name: 'Stara Lista 2025',
                      status: 'archived',
                      is_default: false
                    },
                    error: null
                  })
                }
              }
              return {
                eq: vi.fn().mockReturnValue({
                  order: historyOrderMock
                })
              }
            })
          })
        }
      }
      if (table === 'shopping_list_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }
      }
      if (table === 'shopping_list_items_archive') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'arch-item-1',
                  shopping_list_id: 'arch-list-1',
                  product_id: 'prod-1',
                  total_quantity: 2,
                  is_checked: true,
                  in_pantry: false,
                  product: { id: 'prod-1', name: 'Chleb', unit_type: 'pcs', category_id: 2 }
                }
              ],
              error: null
            })
          })
        }
      }
      return {}
    }) as never)

    const history = await shoppingListService.getHistoryLists('hh-123')
    expect(history).toHaveLength(1)
    expect(history[0].items).toHaveLength(2)
    expect(history[0].items?.every((i) => i.is_checked)).toBe(true)

    const details = await shoppingListService.getListWithDetails('arch-list-1')
    expect(details?.items).toHaveLength(1)
    expect(details?.items[0].product?.name).toBe('Chleb')
  })
})

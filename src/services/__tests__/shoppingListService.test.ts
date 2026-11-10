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
})

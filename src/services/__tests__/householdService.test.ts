import { describe, it, expect, vi, beforeEach } from 'vitest'
import { householdService } from '../householdService'
import { supabase } from '@/lib/supabase'

describe('householdService - RLS Security & Household Creation (CRIT-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Flow 01: createHousehold calls create_household_with_member RPC function (SECURITY DEFINER)', async () => {
    const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: {
        id: 'hh-secure-123',
        name: 'Bezpieczne Gospodarstwo',
        created_at: '2026-10-26T12:00:00Z'
      },
      error: null
    } as any)

    const result = await householdService.createHousehold('Bezpieczne Gospodarstwo', 'user-1')

    expect(mockRpc).toHaveBeenCalledWith('create_household_with_member', {
      p_name: 'Bezpieczne Gospodarstwo'
    })
    expect(result).toEqual({
      id: 'hh-secure-123',
      name: 'Bezpieczne Gospodarstwo',
      created_at: '2026-10-26T12:00:00Z'
    })
  })

  it('Flow 02: falls back to direct insert if RPC function returns error in test/legacy environment', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null,
      error: { message: 'function not found' }
    } as any)

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'households') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'fallback-hh',
                  name: 'Fallback Gospodarstwo',
                  created_at: '2026-10-26T12:00:00Z'
                }
              })
            })
          })
        } as any
      }
      if (table === 'household_members') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        } as any
      }
      return {} as any
    })

    const result = await householdService.createHousehold('Fallback Gospodarstwo', 'user-1')
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Fallback Gospodarstwo')
  })
})

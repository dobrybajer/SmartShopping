import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userService } from '../userService'
import { supabase } from '@/lib/supabase'
import { householdService } from '../householdService'

import authContextSource from '@/context/AuthContext.tsx?raw'
import themeContextSource from '@/theme/ThemeContext.tsx?raw'

describe('userService & Context Layer Separation (NORM-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('Architectural Guard: AuthContext and ThemeContext must NOT import @/lib/supabase', () => {
    expect(authContextSource).not.toContain('@/lib/supabase')
    expect(themeContextSource).not.toContain('@/lib/supabase')

    const authLines = authContextSource.split(/\r?\n/).length
    expect(authLines).toBeLessThan(250)
  })

  it('Flow 01: syncThemeForCurrentUser updates user theme when session exists', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { user: { id: 'user-theme-1' } } as never },
      error: null
    })

    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.spyOn(supabase, 'from').mockReturnValue({ update: updateMock } as never)

    await userService.syncThemeForCurrentUser('midnight-blue')

    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(updateMock).toHaveBeenCalledWith({ theme: 'midnight-blue' })
    expect(eqMock).toHaveBeenCalledWith('id', 'user-theme-1')
  })

  it('Flow 02: syncUserProfileAndHouseholds provisions new household & profile for brand new user', async () => {
    const newHh = { id: 'hh-new-1', name: 'Household (kasia)', created_at: '2026-11-11T00:00:00Z' }
    const createdProfile = {
      id: 'user-new-1',
      email: 'kasia@example.com',
      name: 'kasia',
      household_id: 'hh-new-1',
      language: 'pl',
      theme: 'oled-black',
      created_at: '2026-11-11T00:00:00Z'
    }

    vi.spyOn(householdService, 'createHousehold').mockResolvedValue(newHh)
    vi.spyOn(householdService, 'getUserHouseholds').mockResolvedValue([newHh])

    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null })
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdProfile, error: null })
            })
          })
        }
      }
      if (table === 'household_invites') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] })
          })
        }
      }
      return {}
    }) as never)

    const result = await userService.syncUserProfileAndHouseholds({
      id: 'user-new-1',
      email: 'Kasia@Example.com'
    } as never)

    expect(householdService.createHousehold).toHaveBeenCalledWith('Household (kasia)', 'user-new-1')
    expect(result.userProfile?.id).toBe('user-new-1')
    expect(result.activeHousehold?.id).toBe('hh-new-1')
    expect(result.households).toEqual([newHh])
  })
})


import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sortHouseholdsWithDefault } from '@/lib/calculations/householdSorting'
import { householdService, type Household, type UserProfile } from './householdService'

export interface UserSyncResult {
  userProfile: UserProfile | null
  households: Household[]
  activeHousehold: Household | null
}

function getSavedHouseholdOrder(userId: string): string[] | undefined {
  try {
    const raw = localStorage.getItem(`smartshopping_household_order_${userId}`)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : undefined
  } catch {
    return undefined
  }
}

export const userService = {
  async getSession(): Promise<Session | null> {
    const {
      data: { session }
    } = await supabase.auth.getSession()
    return session
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
  ): () => void {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(callback)
    return () => subscription.unsubscribe()
  },

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    return data ?? null
  },

  async getHouseholdById(householdId: string): Promise<Household | null> {
    const { data } = await supabase.from('households').select('*').eq('id', householdId).maybeSingle()
    return data ?? null
  },

  async syncThemeForCurrentUser(theme: string): Promise<void> {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('users').update({ theme }).eq('id', session.user.id)
      }
    } catch (err) {
      console.error('Error syncing theme to profile:', err)
    }
  },

  /**
   * Ensures a signed-in Supabase user has a `users` profile row, processes pending
   * household invitations, provisions a starter household if needed, and resolves
   * the user's sorted households + active household.
   */
  async syncUserProfileAndHouseholds(currentUser: User): Promise<UserSyncResult> {
    const email = currentUser.email?.toLowerCase().trim() || ''
    const defaultName = email.split('@')[0] || 'User'

    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()

    const { data: pendingInvites } = await supabase
      .from('household_invites')
      .select('*')
      .eq('email', email)

    if (!existingUser) {
      if (pendingInvites && pendingInvites.length > 0) {
        const firstInviteHouseholdId = pendingInvites[0].household_id
        const { data: createdUser, error: uErr } = await supabase
          .from('users')
          .insert({
            id: currentUser.id,
            email,
            name: defaultName,
            household_id: firstInviteHouseholdId,
            created_at: new Date().toISOString()
          })
          .select('*')
          .single()

        if (uErr) console.error('Error creating user from invite:', uErr)
        existingUser = createdUser

        for (const inv of pendingInvites) {
          await supabase.from('household_members').upsert({
            household_id: inv.household_id,
            user_id: currentUser.id
          })
        }
        await supabase.from('household_invites').delete().eq('email', email)
      } else {
        const newHousehold = await householdService.createHousehold(
          `Household (${defaultName})`,
          currentUser.id
        )
        if (newHousehold) {
          const { data: createdUser, error: uErr } = await supabase
            .from('users')
            .insert({
              id: currentUser.id,
              email,
              name: defaultName,
              household_id: newHousehold.id,
              created_at: new Date().toISOString()
            })
            .select('*')
            .single()

          if (uErr) console.error('Error creating user profile:', uErr)
          existingUser = createdUser
        }
      }
    } else {
      if (!existingUser.name) {
        await supabase.from('users').update({ name: defaultName }).eq('id', currentUser.id)
        existingUser = { ...existingUser, name: defaultName }
      }

      if (pendingInvites && pendingInvites.length > 0) {
        for (const inv of pendingInvites) {
          await supabase.from('household_members').upsert({
            household_id: inv.household_id,
            user_id: currentUser.id
          })
        }
        await supabase.from('household_invites').delete().eq('email', email)
      }

      if (existingUser.household_id) {
        await supabase.from('household_members').upsert({
          household_id: existingUser.household_id,
          user_id: currentUser.id
        })
      }
    }

    const allHouseholds = await householdService.getUserHouseholds(currentUser.id)
    const savedOrderIds = getSavedHouseholdOrder(currentUser.id)
    const sortedHouseholds = sortHouseholdsWithDefault(
      allHouseholds,
      existingUser?.household_id,
      savedOrderIds
    )

    let activeHousehold: Household | null = null
    if (existingUser?.household_id) {
      activeHousehold =
        allHouseholds.find((h) => h.id === existingUser?.household_id) ||
        (await this.getHouseholdById(existingUser.household_id))
    }

    if (!activeHousehold && allHouseholds.length > 0) {
      activeHousehold = allHouseholds[0]
      await householdService.setDefaultHousehold(currentUser.id, activeHousehold.id)
      if (existingUser) {
        existingUser = { ...existingUser, household_id: activeHousehold.id }
      }
    }

    if (!activeHousehold && allHouseholds.length === 0) {
      const newH = await householdService.createHousehold(
        `Household (${defaultName})`,
        currentUser.id
      )
      if (newH) {
        await householdService.setDefaultHousehold(currentUser.id, newH.id)
        activeHousehold = newH
        return {
          userProfile: existingUser,
          households: [newH],
          activeHousehold
        }
      }
    }

    return {
      userProfile: existingUser,
      households: sortedHouseholds,
      activeHousehold
    }
  },

  async refreshUserContext(
    userId: string,
    currentHouseholdId?: string | null
  ): Promise<{ userProfile: UserProfile | null; households: Household[]; nextActiveHousehold: Household | null }> {
    const [freshProfile, households] = await Promise.all([
      this.getUserProfile(userId),
      householdService.getUserHouseholds(userId)
    ])

    let nextActiveHousehold: Household | null = null
    if (currentHouseholdId) {
      nextActiveHousehold =
        households.find((h) => h.id === currentHouseholdId) ||
        households.find((h) => h.id === freshProfile?.household_id) ||
        households[0] ||
        null
    }

    return { userProfile: freshProfile, households, nextActiveHousehold }
  },

  async deleteHouseholdAndResolveNext(
    user: User,
    householdId: string,
    activeHouseholdId: string | undefined,
    userHouseholds: Household[],
    defaultHouseholdId: string | null | undefined
  ): Promise<{ success: boolean; remaining: Household[]; nextActive: Household | null }> {
    const success = await householdService.deleteHousehold(householdId)
    if (!success) {
      return { success: false, remaining: userHouseholds, nextActive: null }
    }

    const remaining = userHouseholds.filter((h) => h.id !== householdId)
    let nextActive: Household | null = null

    if (activeHouseholdId === householdId) {
      if (remaining.length > 0) {
        nextActive = remaining.find((h) => h.id === defaultHouseholdId) || remaining[0]
      } else {
        const defaultName = (user.email?.toLowerCase().trim() || '').split('@')[0] || 'User'
        const newH = await householdService.createHousehold(`Household (${defaultName})`, user.id)
        if (newH) {
          await householdService.setDefaultHousehold(user.id, newH.id)
          return { success: true, remaining: [newH], nextActive: newH }
        }
      }
    } else if (defaultHouseholdId === householdId) {
      const fallback = remaining[0] || null
      await householdService.setDefaultHousehold(user.id, fallback ? fallback.id : null)
    }

    return { success: true, remaining, nextActive }
  }
}

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type Household = Database['public']['Tables']['households']['Row']
export type UserProfile = Database['public']['Tables']['users']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type HouseholdInvite = Database['public']['Tables']['household_invites']['Row']

export interface MemberDetail {
  id: string
  userId: string
  name: string
  email: string
  joinedAt: string | null
}

export interface InviteDetail {
  id: string
  email: string
  createdAt: string | null
}

export const householdService = {
  /**
   * Fetches all households associated with the given user
   */
  async getUserHouseholds(userId: string): Promise<Household[]> {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user households:', error)
        return []
      }

      const households: Household[] = []
      data?.forEach((item: any) => {
        if (item.households) {
          households.push(item.households)
        }
      })

      return households
    } catch (err) {
      console.error('Error in getUserHouseholds:', err)
      return []
    }
  },

  /**
   * Updates name of specified household
   */
  async updateHouseholdName(householdId: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('households')
        .update({ name: name.trim() })
        .eq('id', householdId)

      if (error) {
        console.error('Error updating household name:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in updateHouseholdName:', err)
      return false
    }
  },

  /**
   * Sets default household for user in `users` table
   */
  async setDefaultHousehold(userId: string, householdId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ household_id: householdId })
        .eq('id', userId)

      if (error) {
        console.error('Error setting default household:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in setDefaultHousehold:', err)
      return false
    }
  },

  /**
   * Creates new household and assigns current user as member
   */
  async createHousehold(name: string, userId: string): Promise<Household | null> {
    try {
      const trimmedName = name.trim() || 'New Household'
      const newHouseholdId = crypto.randomUUID()

      // 1. Insert household without .select() to avoid RLS SELECT rejection before membership exists
      const { error: hError } = await supabase
        .from('households')
        .insert({
          id: newHouseholdId,
          name: trimmedName
        })

      if (hError) {
        console.error('Error creating new household:', hError)
        return null
      }

      // 2. Assign current user to household_members so RLS SELECT policy is satisfied
      const { error: mError } = await supabase
        .from('household_members')
        .insert({
          household_id: newHouseholdId,
          user_id: userId
        })

      if (mError) {
        console.error('Error assigning member to new household:', mError)
      }

      // 3. Fetch newly created household (RLS SELECT now passes)
      const { data: createdRow } = await supabase
        .from('households')
        .select('*')
        .eq('id', newHouseholdId)
        .maybeSingle()

      if (createdRow) {
        return createdRow
      }

      return {
        id: newHouseholdId,
        name: trimmedName,
        created_at: new Date().toISOString()
      }
    } catch (err) {
      console.error('Error in createHousehold:', err)
      return null
    }
  },

  /**
   * Adds user to household via email address:
   * - if user already exists in `users`: adds to `household_members`
   * - if user does not exist yet: creates invitation in `household_invites`
   */
  async addUserToHousehold(
    householdId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, message: 'Please provide a valid email address.' }
      }

      // 1. Check if user exists in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existingUser) {
        // Check if already a member of this household
        const { data: existingMember } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', householdId)
          .eq('user_id', existingUser.id)
          .maybeSingle()

        if (existingMember) {
          return { success: false, message: 'This user is already a member of this household.' }
        }

        // Add to household_members
        const { error: memberErr } = await supabase.from('household_members').insert({
          household_id: householdId,
          user_id: existingUser.id
        })

        if (memberErr) {
          return { success: false, message: 'Failed to add user to household.' }
        }

        // If user didn't have default household, set this one
        if (!existingUser.household_id) {
          await supabase
            .from('users')
            .update({ household_id: householdId })
            .eq('id', existingUser.id)
        }

        return {
          success: true,
          message: `User ${cleanEmail} was added to the household.`
        }
      } else {
        // User has not registered yet - create invitation record
        const { error: inviteErr } = await supabase.from('household_invites').upsert({
          household_id: householdId,
          email: cleanEmail
        })

        if (inviteErr) {
          return { success: false, message: 'Failed to save invitation.' }
        }

        return {
          success: true,
          message: `Invitation for ${cleanEmail} has been recorded.`
        }
      }
    } catch (err) {
      console.error('Error in addUserToHousehold:', err)
      return { success: false, message: 'An error occurred while adding user.' }
    }
  },

  /**
   * Fetches members and pending invites for household
   */
  async getHouseholdMembers(householdId: string): Promise<{
    members: MemberDetail[]
    invites: InviteDetail[]
  }> {
    try {
      // Members
      const { data: memberRows, error: mErr } = await supabase
        .from('household_members')
        .select('id, user_id, created_at, users(*)')
        .eq('household_id', householdId)

      if (mErr) {
        console.error('Error fetching members:', mErr)
      }

      const members: MemberDetail[] = []
      memberRows?.forEach((row: any) => {
        const u = row.users
        members.push({
          id: row.id,
          userId: row.user_id,
          name: u?.name || u?.email?.split('@')[0] || 'User',
          email: u?.email || '',
          joinedAt: row.created_at
        })
      })

      // Invites
      const { data: inviteRows, error: iErr } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)

      if (iErr) {
        console.error('Error fetching invites:', iErr)
      }

      const invites: InviteDetail[] = (inviteRows || []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        createdAt: inv.created_at
      }))

      return { members, invites }
    } catch (err) {
      console.error('Error in getHouseholdMembers:', err)
      return { members: [], invites: [] }
    }
  },

  /**
   * Updates user profile (e.g. display name)
   */
  async updateUserProfile(userId: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: name.trim() })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user profile:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in updateUserProfile:', err)
      return false
    }
  },

  /**
   * Updates user interface language preference in Supabase
   */
  async updateUserLanguage(userId: string, language: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ language: language.trim() })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user language:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in updateUserLanguage:', err)
      return false
    }
  },

  /**
   * Updates user visual theme preference in Supabase
   */
  async updateUserTheme(userId: string, theme: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ theme: theme.trim() })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user theme:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in updateUserTheme:', err)
      return false
    }
  },

  /**
   * Deletes a household and relies on database cascading to clean up all related
   * products, meals, shopping lists, members, invites, and category settings.
   */
  async deleteHousehold(householdId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId)

      if (error) {
        console.error('Error deleting household:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error in deleteHousehold:', err)
      return false
    }
  }
}

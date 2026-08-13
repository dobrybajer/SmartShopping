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
   * Pobiera wszystkie gospodarstwa, do których należy użytkownik
   */
  async getUserHouseholds(userId: string): Promise<Household[]> {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', userId)

      if (error) {
        console.error('Błąd pobierania gospodarstw użytkownika:', error)
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
      console.error('Błąd getUserHouseholds:', err)
      return []
    }
  },

  /**
   * Aktualizuje nazwę wybranego gospodarstwa
   */
  async updateHouseholdName(householdId: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('households')
        .update({ name: name.trim() })
        .eq('id', householdId)

      if (error) {
        console.error('Błąd aktualizacji nazwy gospodarstwa:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Błąd updateHouseholdName:', err)
      return false
    }
  },

  /**
   * Ustawia domyślne gospodarstwo dla użytkownika w tabeli `users`
   */
  async setDefaultHousehold(userId: string, householdId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ household_id: householdId })
        .eq('id', userId)

      if (error) {
        console.error('Błąd ustawiania domyślnego gospodarstwa:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Błąd setDefaultHousehold:', err)
      return false
    }
  },

  /**
   * Tworzy nowe gospodarstwo i przypisuje do niego obecnego użytkownika
   */
  async createHousehold(name: string, userId: string): Promise<Household | null> {
    try {
      const trimmedName = name.trim() || 'Nowe Gospodarstwo'
      const { data: newHousehold, error: hError } = await supabase
        .from('households')
        .insert({ name: trimmedName })
        .select('*')
        .single()

      if (hError || !newHousehold) {
        console.error('Błąd tworzenia nowego gospodarstwa:', hError)
        return null
      }

      const { error: mError } = await supabase
        .from('household_members')
        .insert({
          household_id: newHousehold.id,
          user_id: userId
        })

      if (mError) {
        console.error('Błąd przypisywania członka do nowego gospodarstwa:', mError)
      }

      return newHousehold
    } catch (err) {
      console.error('Błąd createHousehold:', err)
      return null
    }
  },

  /**
   * Dodaje użytkownika do gospodarstwa na podstawie adresu e-mail:
   * - jeśli użytkownik już istnieje w `users`: dodaje do `household_members`; jeśli nie miał defaultowego gospodarstwa, ustawia je
   * - jeśli użytkownik jeszcze nie istnieje: dodaje zaproszenie do `household_invites`
   */
  async addUserToHousehold(
    householdId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, message: 'Podaj poprawny adres e-mail.' }
      }

      // 1. Sprawdź czy użytkownik istnieje w bazie
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existingUser) {
        // Sprawdź czy już nie jest członkiem tego gospodarstwa
        const { data: existingMember } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', householdId)
          .eq('user_id', existingUser.id)
          .maybeSingle()

        if (existingMember) {
          return { success: false, message: 'Ten użytkownik już należy do tego gospodarstwa.' }
        }

        // Dodaj do household_members
        const { error: memberErr } = await supabase.from('household_members').insert({
          household_id: householdId,
          user_id: existingUser.id
        })

        if (memberErr) {
          return { success: false, message: 'Nie udało się dodać użytkownika do gospodarstwa.' }
        }

        // Jeśli użytkownik nie miał jeszcze gospodarstwa domyślnego, ustaw to gospodarstwo jako default
        if (!existingUser.household_id) {
          await supabase
            .from('users')
            .update({ household_id: householdId })
            .eq('id', existingUser.id)
        }

        return {
          success: true,
          message: `Użytkownik ${cleanEmail} został dodany do gospodarstwa.`
        }
      } else {
        // Użytkownik nie założył jeszcze konta - utwórz zaproszenie
        const { error: inviteErr } = await supabase.from('household_invites').upsert({
          household_id: householdId,
          email: cleanEmail
        })

        if (inviteErr) {
          return { success: false, message: 'Nie udało się zapisać zaproszenia.' }
        }

        return {
          success: true,
          message: `Zaproszenie dla ${cleanEmail} zostało zapisane. Gospodarstwo stanie się domyślne po pierwszym logowaniu.`
        }
      }
    } catch (err) {
      console.error('Błąd addUserToHousehold:', err)
      return { success: false, message: 'Wystąpił błąd podczas dodawania użytkownika.' }
    }
  },

  /**
   * Pobiera listę członków i oczekujących zaproszeń dla danego gospodarstwa
   */
  async getHouseholdMembers(householdId: string): Promise<{
    members: MemberDetail[]
    invites: InviteDetail[]
  }> {
    try {
      // Członkowie
      const { data: memberRows, error: mErr } = await supabase
        .from('household_members')
        .select('id, user_id, created_at, users(*)')
        .eq('household_id', householdId)

      if (mErr) {
        console.error('Błąd pobierania członków:', mErr)
      }

      const members: MemberDetail[] = []
      memberRows?.forEach((row: any) => {
        const u = row.users
        members.push({
          id: row.id,
          userId: row.user_id,
          name: u?.name || u?.email?.split('@')[0] || 'Użytkownik',
          email: u?.email || '',
          joinedAt: row.created_at
        })
      })

      // Zaproszenia
      const { data: inviteRows, error: iErr } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)

      if (iErr) {
        console.error('Błąd pobierania zaproszeń:', iErr)
      }

      const invites: InviteDetail[] = (inviteRows || []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        createdAt: inv.created_at
      }))

      return { members, invites }
    } catch (err) {
      console.error('Błąd getHouseholdMembers:', err)
      return { members: [], invites: [] }
    }
  },

  /**
   * Aktualizuje profil użytkownika (np. nazwę wyświetlaną)
   */
  async updateUserProfile(userId: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: name.trim() })
        .eq('id', userId)

      if (error) {
        console.error('Błąd aktualizacji profilu użytkownika:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Błąd updateUserProfile:', err)
      return false
    }
  }
}

import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type {
  Household,
  UserProfile,
  MemberDetail,
  InviteDetail
} from '@/services/householdService'
import type { SupportedLanguage } from '@/i18n/types'

export interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  household: Household | null
  userHouseholds: Household[]
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  switchHousehold: (householdId: string) => Promise<void>
  updateUserProfileName: (name: string) => Promise<boolean>
  updateUserLanguage: (lang: SupportedLanguage) => Promise<boolean>
  updateUserTheme: (theme: string) => Promise<boolean>
  updateHouseholdName: (householdId: string, name: string) => Promise<boolean>
  setDefaultHousehold: (householdId: string | null) => Promise<boolean>
  reorderHouseholds: (orderedHouseholdIds: string[]) => void
  createHousehold: (name: string) => Promise<Household | null>
  deleteHousehold: (householdId: string) => Promise<boolean>
  addUserToHousehold: (householdId: string, email: string) => Promise<{ success: boolean; message: string }>
  getHouseholdMembers: (householdId: string) => Promise<{ members: MemberDetail[]; invites: InviteDetail[] }>
  refreshData: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)


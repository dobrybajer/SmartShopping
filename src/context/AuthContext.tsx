import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  householdService,
  type Household,
  type UserProfile,
  type MemberDetail,
  type InviteDetail
} from '@/services/householdService'
import { useI18nStore } from '@/i18n'
import type { SupportedLanguage } from '@/i18n/types'

interface AuthContextType {
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
  updateHouseholdName: (householdId: string, name: string) => Promise<boolean>
  setDefaultHousehold: (householdId: string | null) => Promise<boolean>
  createHousehold: (name: string) => Promise<Household | null>
  addUserToHousehold: (householdId: string, email: string) => Promise<{ success: boolean; message: string }>
  getHouseholdMembers: (householdId: string) => Promise<{ members: MemberDetail[]; invites: InviteDetail[] }>
  refreshData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)

  const isSyncingRef = useRef(false)

  const syncUserAndHousehold = async (currentUser: User) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      const email = currentUser.email?.toLowerCase().trim() || ''
      const defaultName = email.split('@')[0] || 'User'

      // 1. Check if user exists in `users` table
      let { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      // 2. Check for pending invitations for this email address
      const { data: pendingInvites } = await supabase
        .from('household_invites')
        .select('*')
        .eq('email', email)

      if (!existingUser) {
        // First-time user sign-in
        if (pendingInvites && pendingInvites.length > 0) {
          // User was invited to household
          const firstInviteHouseholdId = pendingInvites[0].household_id

          const { data: createdUser, error: uErr } = await supabase
            .from('users')
            .insert({
              id: currentUser.id,
              email: email,
              name: defaultName,
              household_id: firstInviteHouseholdId,
              created_at: new Date().toISOString()
            })
            .select('*')
            .single()

          if (uErr) console.error('Error creating user from invite:', uErr)
          existingUser = createdUser

          // Add user to all invited households
          for (const inv of pendingInvites) {
            await supabase.from('household_members').upsert({
              household_id: inv.household_id,
              user_id: currentUser.id
            })
          }

          // Delete processed invites
          await supabase.from('household_invites').delete().eq('email', email)
        } else {
          // Brand new user without invites - create 1st household
          const householdName = `Household (${defaultName})`

          const { data: newHousehold, error: hErr } = await supabase
            .from('households')
            .insert({ name: householdName })
            .select('*')
            .single()

          if (hErr || !newHousehold) {
            console.error('Error creating household:', hErr)
          } else {
            const { data: createdUser, error: uErr } = await supabase
              .from('users')
              .insert({
                id: currentUser.id,
                email: email,
                name: defaultName,
                household_id: newHousehold.id,
                created_at: new Date().toISOString()
              })
              .select('*')
              .single()

            if (uErr) console.error('Error creating user profile:', uErr)
            existingUser = createdUser

            await supabase.from('household_members').upsert({
              household_id: newHousehold.id,
              user_id: currentUser.id
            })
          }
        }
      } else {
        // Existing user - ensure name is filled
        if (!existingUser.name) {
          await supabase.from('users').update({ name: defaultName }).eq('id', currentUser.id)
          existingUser.name = defaultName
        }

        // If new invitations arrived after registration, process them
        if (pendingInvites && pendingInvites.length > 0) {
          for (const inv of pendingInvites) {
            await supabase.from('household_members').upsert({
              household_id: inv.household_id,
              user_id: currentUser.id
            })
          }
          await supabase.from('household_invites').delete().eq('email', email)
        }

        // Ensure user is connected to default household in household_members
        if (existingUser.household_id) {
          await supabase.from('household_members').upsert({
            household_id: existingUser.household_id,
            user_id: currentUser.id
          })
        }
      }

      // 3. Sync language preference if present in user profile
      if (existingUser?.language && (existingUser.language === 'pl' || existingUser.language === 'en')) {
        useI18nStore.getState().setLanguage(existingUser.language as SupportedLanguage)
      }

      // 4. Fetch all user households
      const allHouseholds = await householdService.getUserHouseholds(currentUser.id)
      setUserHouseholds(allHouseholds)
      setUserProfile(existingUser)

      // Choose active household: default or first available
      let activeH: Household | null = null

      if (existingUser?.household_id) {
        activeH = allHouseholds.find((h) => h.id === existingUser?.household_id) || null
        if (!activeH) {
          const { data: directH } = await supabase
            .from('households')
            .select('*')
            .eq('id', existingUser.household_id)
            .maybeSingle()
          if (directH) activeH = directH
        }
      }

      if (!activeH && allHouseholds.length > 0) {
        activeH = allHouseholds[0]
        await householdService.setDefaultHousehold(currentUser.id, activeH.id)
        if (existingUser) existingUser.household_id = activeH.id
      }

      // Fallback in rare case of 0 households
      if (!activeH && allHouseholds.length === 0) {
        const householdName = `Household (${defaultName})`
        const newH = await householdService.createHousehold(householdName, currentUser.id)
        if (newH) {
          await householdService.setDefaultHousehold(currentUser.id, newH.id)
          activeH = newH
          setUserHouseholds([newH])
        }
      }

      setHousehold(activeH)
    } catch (err) {
      console.error('Error during user profile sync:', err)
    } finally {
      isSyncingRef.current = false
    }
  }

  const refreshData = async () => {
    if (!user) return
    const { data: freshProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (freshProfile) {
      setUserProfile(freshProfile)
    }

    const households = await householdService.getUserHouseholds(user.id)
    setUserHouseholds(households)

    if (household && !households.some((h) => h.id === household.id)) {
      const def = households.find((h) => h.id === freshProfile?.household_id) || households[0] || null
      setHousehold(def)
    } else if (household) {
      const updatedCurrent = households.find((h) => h.id === household.id)
      if (updatedCurrent) setHousehold(updatedCurrent)
    }
  }

  useEffect(() => {
    // Session initialization
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncUserAndHousehold(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Auth state listener
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await syncUserAndHousehold(newSession.user)
      } else {
        setUserProfile(null)
        setHousehold(null)
        setUserHouseholds([])
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    setUser(null)
    setUserProfile(null)
    setHousehold(null)
    setUserHouseholds([])
  }

  const switchHousehold = async (householdId: string) => {
    const target = userHouseholds.find((h) => h.id === householdId)
    if (target) {
      setHousehold(target)
    } else {
      const { data } = await supabase.from('households').select('*').eq('id', householdId).single()
      if (data) setHousehold(data)
    }
  }

  const updateUserProfileName = async (name: string): Promise<boolean> => {
    if (!user) return false
    const success = await householdService.updateUserProfile(user.id, name)
    if (success) {
      setUserProfile((prev) => (prev ? { ...prev, name } : null))
    }
    return success
  }

  const updateUserLanguage = async (lang: SupportedLanguage): Promise<boolean> => {
    useI18nStore.getState().setLanguage(lang)
    if (!user) return true
    const success = await householdService.updateUserLanguage(user.id, lang)
    if (success) {
      setUserProfile((prev) => (prev ? { ...prev, language: lang } : null))
    }
    return success
  }

  const updateHouseholdName = async (householdId: string, name: string): Promise<boolean> => {
    const success = await householdService.updateHouseholdName(householdId, name)
    if (success) {
      setHousehold((prev) => (prev && prev.id === householdId ? { ...prev, name } : prev))
      setUserHouseholds((prev) =>
        prev.map((h) => (h.id === householdId ? { ...h, name } : h))
      )
    }
    return success
  }

  const setDefaultHousehold = async (householdId: string | null): Promise<boolean> => {
    if (!user) return false
    const success = await householdService.setDefaultHousehold(user.id, householdId)
    if (success) {
      setUserProfile((prev) => (prev ? { ...prev, household_id: householdId } : null))
    }
    return success
  }

  const createHousehold = async (name: string): Promise<Household | null> => {
    if (!user) return null
    const newHousehold = await householdService.createHousehold(name, user.id)
    if (newHousehold) {
      setUserHouseholds((prev) => [...prev, newHousehold])
      setHousehold(newHousehold)
    }
    return newHousehold
  }

  const addUserToHousehold = async (
    householdId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    return householdService.addUserToHousehold(householdId, email)
  }

  const getHouseholdMembers = async (householdId: string) => {
    return householdService.getHouseholdMembers(householdId)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        session,
        household,
        userHouseholds,
        loading,
        signInWithGoogle,
        signOut,
        switchHousehold,
        updateUserProfileName,
        updateUserLanguage,
        updateHouseholdName,
        setDefaultHousehold,
        createHousehold,
        addUserToHousehold,
        getHouseholdMembers,
        refreshData
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

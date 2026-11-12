import React, { useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { householdService, type Household, type UserProfile } from '@/services/householdService'
import { userService } from '@/services/userService'
import { useI18nStore } from '@/i18n'
import type { SupportedLanguage } from '@/i18n/types'
import { sortHouseholdsWithDefault } from '@/lib/calculations/householdSorting'
import { AuthContext } from './authContextDef'

function readSavedHouseholdOrder(userId: string): string[] | undefined {
  try {
    const raw = localStorage.getItem(`smartshopping_household_order_${userId}`)
    return raw ? (JSON.parse(raw) as string[]) : undefined
  } catch {
    return undefined
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)

  const isSyncingRef = useRef(false)
  const userProfileRef = useRef<UserProfile | null>(null)

  const syncUserAndHousehold = async (currentUser: User) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    try {
      const result = await userService.syncUserProfileAndHouseholds(currentUser)
      const lang = result.userProfile?.language
      if (lang === 'pl' || lang === 'en') {
        useI18nStore.getState().setLanguage(lang as SupportedLanguage)
      }
      setUserHouseholds(result.households)
      userProfileRef.current = result.userProfile
      setUserProfile(result.userProfile)
      const nextActive = result.activeHousehold
      setHousehold((prev) =>
        prev && nextActive && prev.id === nextActive.id && prev.name === nextActive.name ? prev : nextActive
      )
    } catch (err) {
      console.error('Error during user profile sync:', err)
    } finally {
      isSyncingRef.current = false
    }
  }

  const refreshData = async () => {
    if (!user) return
    const { userProfile: freshProfile, households, nextActiveHousehold } =
      await userService.refreshUserContext(user.id, household?.id)
    if (freshProfile) {
      userProfileRef.current = freshProfile
      setUserProfile(freshProfile)
    }
    setUserHouseholds(households)
    if (nextActiveHousehold) {
      setHousehold((prev) =>
        prev?.id === nextActiveHousehold.id && prev?.name === nextActiveHousehold.name
          ? prev
          : nextActiveHousehold
      )
    }
  }

  useEffect(() => {
    userService.getSession().then((initialSession) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        syncUserAndHousehold(initialSession.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    return userService.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      const newUser = newSession?.user ?? null
      setUser((prev) => (prev?.id === newUser?.id ? prev : newUser))
      if (newUser) {
        if (userProfileRef.current?.id === newUser.id) {
          setLoading(false)
          return
        }
        await syncUserAndHousehold(newUser)
      } else {
        userProfileRef.current = null
        setUserProfile(null)
        setHousehold(null)
        setUserHouseholds([])
      }
      setLoading(false)
    })
  }, [])

  const signOut = async () => {
    await userService.signOut()
    setUser(null)
    setUserProfile(null)
    setHousehold(null)
    setUserHouseholds([])
  }

  const switchHousehold = async (householdId: string) => {
    const target = userHouseholds.find((h) => h.id === householdId)
    if (target) {
      setHousehold(target)
      return
    }
    const fetched = await userService.getHouseholdById(householdId)
    if (fetched) setHousehold(fetched)
  }

  const updateUserProfileName = async (name: string): Promise<boolean> => {
    if (!user) return false
    const success = await householdService.updateUserProfile(user.id, name)
    if (success) setUserProfile((prev) => (prev ? { ...prev, name } : null))
    return success
  }

  const updateUserLanguage = async (lang: SupportedLanguage): Promise<boolean> => {
    useI18nStore.getState().setLanguage(lang)
    if (!user) return true
    const success = await householdService.updateUserLanguage(user.id, lang)
    if (success) setUserProfile((prev) => (prev ? { ...prev, language: lang } : null))
    return success
  }

  const updateUserTheme = async (theme: string): Promise<boolean> => {
    if (!user) return true
    const success = await householdService.updateUserTheme(user.id, theme)
    if (success) setUserProfile((prev) => (prev ? { ...prev, theme } : null))
    return success
  }

  const updateHouseholdName = async (householdId: string, name: string): Promise<boolean> => {
    const success = await householdService.updateHouseholdName(householdId, name)
    if (success) {
      setHousehold((prev) => (prev && prev.id === householdId ? { ...prev, name } : prev))
      setUserHouseholds((prev) => prev.map((h) => (h.id === householdId ? { ...h, name } : h)))
    }
    return success
  }

  const setDefaultHousehold = async (householdId: string | null): Promise<boolean> => {
    if (!user) return false
    const success = await householdService.setDefaultHousehold(user.id, householdId)
    if (success) {
      setUserProfile((prev) => (prev ? { ...prev, household_id: householdId } : null))
      const savedOrderIds = readSavedHouseholdOrder(user.id)
      setUserHouseholds((prev) => sortHouseholdsWithDefault(prev, householdId, savedOrderIds))
    }
    return success
  }

  const reorderHouseholds = (orderedHouseholdIds: string[]) => {
    if (!user) return
    localStorage.setItem(`smartshopping_household_order_${user.id}`, JSON.stringify(orderedHouseholdIds))
    setUserHouseholds((prev) => sortHouseholdsWithDefault(prev, userProfile?.household_id, orderedHouseholdIds))
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

  const deleteHousehold = async (householdId: string): Promise<boolean> => {
    if (!user) return false
    const res = await userService.deleteHouseholdAndResolveNext(
      user,
      householdId,
      household?.id,
      userHouseholds,
      userProfile?.household_id
    )
    if (!res.success) return false
    setUserHouseholds(res.remaining)
    if (res.nextActive) setHousehold(res.nextActive)
    else if (household?.id === householdId) setHousehold(null)
    return true
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
        signInWithGoogle: () => userService.signInWithGoogle(window.location.origin),
        signOut,
        switchHousehold,
        updateUserProfileName,
        updateUserLanguage,
        updateUserTheme,
        updateHouseholdName,
        setDefaultHousehold,
        reorderHouseholds,
        createHousehold,
        deleteHousehold,
        addUserToHousehold: (hId, email) => householdService.addUserToHousehold(hId, email),
        getHouseholdMembers: (hId) => householdService.getHouseholdMembers(hId),
        refreshData
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

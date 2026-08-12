import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Household = Database['public']['Tables']['households']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  household: Household | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)

  const syncUserAndHousehold = async (currentUser: User) => {
    try {
      // 1. Sprawdź czy użytkownik istnieje w tabeli `users`
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, households(*)')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (userError) {
        console.error('Błąd pobierania danych użytkownika:', userError)
      }

      if (userData && userData.household_id) {
        // Użytkownik i gospodarstwo już istnieją
        const { data: householdData } = await supabase
          .from('households')
          .select('*')
          .eq('id', userData.household_id)
          .single()

        setHousehold(householdData)
      } else {
        // Pierwsze logowanie: Utwórz nowe gospodarstwo i przypisz użytkownika
        const householdName = `Gospodarstwo (${currentUser.email?.split('@')[0] || 'Moje'})`

        const { data: newHousehold, error: createHouseholdErr } = await supabase
          .from('households')
          .insert({ name: householdName })
          .select('*')
          .single()

        if (createHouseholdErr || !newHousehold) {
          console.error('Błąd tworzenia gospodarstwa domowego:', createHouseholdErr)
          return
        }

        const { error: upsertUserErr } = await supabase.from('users').upsert({
          id: currentUser.id,
          email: currentUser.email || '',
          household_id: newHousehold.id
        })

        if (upsertUserErr) {
          console.error('Błąd powiązania użytkownika z gospodarstwem:', upsertUserErr)
        } else {
          setHousehold(newHousehold)
        }
      }
    } catch (err) {
      console.error('Błąd podczas synchronizacji konta:', err)
    }
  }

  useEffect(() => {
    // Inicjalizacja obecnej sesji
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncUserAndHousehold(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Nasłuchiwanie zmian stanu autoryzacji
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await syncUserAndHousehold(session.user)
      } else {
        setHousehold(null)
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
      console.error('Błąd logowania przez Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Błąd wylogowywania:', error)
      throw error
    }
    setHousehold(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        household,
        loading,
        signInWithGoogle,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth musi być użyty wewnątrz AuthProvider')
  }
  return context
}

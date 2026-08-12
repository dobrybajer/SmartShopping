import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/AppLogo'

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true)
      setErrorMessage(null)
      await signInWithGoogle()
    } catch (err: unknown) {
      console.error(err)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Wystąpił błąd podczas próby logowania. Spróbuj ponownie.'
      )
      setIsSigningIn(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black text-white flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="pt-16 flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl relative p-2">
          <AppLogo size={56} />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          SmartShopping
        </h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xs leading-relaxed">
          Inteligentne planowanie posiłków, przeliczanie makroskładników i wspólne listy zakupowe w czasie rzeczywistym.
        </p>
      </div>

      {/* Action Section */}
      <div className="pb-12 flex flex-col items-center w-full z-10 gap-4">
        {errorMessage && (
          <div className="w-full p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs text-center">
            {errorMessage}
          </div>
        )}

        <Button
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
          className="w-full h-13 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 rounded-xl font-medium flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
                />
              </svg>
              <span>Zaloguj przez Google</span>
            </>
          )}
        </Button>

        <p className="text-zinc-600 text-xs text-center">
          Logując się, akceptujesz regulamin Twojego gospodarstwa domowego.
        </p>
      </div>
    </div>
  )
}

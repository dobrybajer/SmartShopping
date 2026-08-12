import { useAuth } from '@/context/AuthContext'
import { LoginScreen } from '@/components/LoginScreen'
import { Button } from '@/components/ui/button'
import { LogOut, Home, ShoppingCart, BookOpen, History } from 'lucide-react'

export default function App() {
  const { user, household, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs tracking-wide">Ładowanie SmartShopping...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black text-white flex flex-col justify-between relative border-x border-zinc-900 shadow-2xl">
      {/* Top Header */}
      <header className="p-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm tracking-tight text-zinc-100">
            {household?.name || 'Moje Gospodarstwo'}
          </h2>
          <p className="text-xs text-zinc-500">{user.email}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
          title="Wyloguj się"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Area Placeholder */}
      <main className="p-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
          <Home className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-200">Zalogowano pomyślnie!</h3>
        <p className="text-xs text-zinc-400 mt-2 max-w-xs leading-relaxed">
          Strona autoryzacji oraz powiązanie z gospodarstwem domowym (<span className="text-emerald-400 font-mono">{household?.id?.slice(0, 8)}...</span>) działają prawidłowo.
        </p>
      </main>

      {/* Bottom Navigation Bar Placeholder */}
      <nav className="bg-zinc-950 border-t border-zinc-900 p-2 flex items-center justify-around sticky bottom-0 z-20">
        <button className="flex flex-col items-center gap-1 text-emerald-400 p-2">
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">Przepisy</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 p-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Koszyk</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 p-2">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Aktywna</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 p-2">
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">Historia</span>
        </button>
      </nav>
    </div>
  )
}

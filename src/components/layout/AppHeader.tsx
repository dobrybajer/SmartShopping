import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'

interface AppHeaderProps {
  title: string
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const { user, household, signOut } = useAuth()

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-30 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-1 shrink-0">
          <AppLogo size={28} />
        </div>

        <div>
          <h1 className="font-bold text-sm text-zinc-100 tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[180px]">
            {household?.name || 'Gospodarstwo domowe'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-xs shadow-inner"
          title={user?.email || ''}
        >
          {userInitial}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
          title="Wyloguj się"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}

import { ShoppingBag, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-8 bg-zinc-950 p-8 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/20 text-black">
            <ShoppingBag className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Smart Shopping
          </h1>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-zinc-400 text-sm leading-relaxed">
            Środowisko frontendowe zostało pomyślnie zainicjalizowane.
          </p>

          <div className="pt-2 space-y-2.5 text-left text-xs text-zinc-300">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Vite + React + TypeScript</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tailwind CSS ("True Black" #000000)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Alias ścieżek <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">@/*</code></span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Komponenty <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">shadcn/ui</code></span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-lg shadow-emerald-500/20">
            Gotowe do Fazy 2
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-800/60">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Faza 1: Punkt 3 ukończony</span>
        </div>
      </div>
    </div>
  );
}

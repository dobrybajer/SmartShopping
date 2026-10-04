import React from 'react'
import { useToastStore, type ToastType } from '@/store/useToastStore'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const COLOR_STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/40 text-emerald-400 bg-card/95',
  error: 'border-rose-500/40 text-rose-400 bg-card/95',
  warning: 'border-amber-500/40 text-amber-400 bg-card/95',
  info: 'border-primary/40 text-primary bg-card/95'
}

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200",
              COLOR_STYLES[t.type]
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-foreground truncate">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors shrink-0 cursor-pointer"
              title="Close"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

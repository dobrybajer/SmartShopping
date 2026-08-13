import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Mail, Calendar, Check, Save, Lock } from 'lucide-react'

interface AccountDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AccountDetailsDialog: React.FC<AccountDetailsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { user, userProfile, updateUserProfileName } = useAuth()
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (open) {
      setName(userProfile?.name || user?.email?.split('@')[0] || '')
      setStatusMessage(null)
    }
  }, [open, userProfile, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    setStatusMessage(null)

    const success = await updateUserProfileName(name.trim())
    setIsSaving(false)

    if (success) {
      setStatusMessage({ type: 'success', text: 'Dane konta zostały pomyślnie zaktualizowane.' })
      setTimeout(() => {
        setStatusMessage(null)
      }, 3000)
    } else {
      setStatusMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania zmian.' })
    }
  }

  // Formatowanie daty pierwszego logowania
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Brak danych'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  const createdAtDate = userProfile?.created_at || (user as any)?.created_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-100">Dane Konta</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Informacje o Twoim profilu w SmartShopping
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
          {/* Nazwa */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nazwa wyświetlana</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Kamil"
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500"
              required
            />
            <p className="text-[11px] text-zinc-500">
              Nazwa widoczna dla innych członków Twoich gospodarstw domowych.
            </p>
          </div>

          {/* Email (read-only, wyszarzony) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>Adres e-mail</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" /> tylko do odczytu
              </span>
            </label>
            <div className="relative">
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-zinc-900/40 border-zinc-800/80 text-zinc-500 cursor-not-allowed select-none font-mono text-xs pl-3"
              />
            </div>
          </div>

          {/* Utworzono (data pierwszego logowania) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Utworzono (data pierwszego logowania)</span>
            </label>
            <div className="p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-xs text-zinc-400 font-mono">
              {formatDate(createdAtDate)}
            </div>
          </div>

          {/* Powiadomienie o statusie */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {statusMessage.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <DialogFooter className="mt-2 pt-2 border-t border-zinc-900 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 text-xs"
            >
              Zamknij
            </Button>

            <Button
              type="submit"
              disabled={isSaving || !name.trim() || name.trim() === (userProfile?.name || '')}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs gap-1.5 disabled:opacity-40"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Zapisz zmiany</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

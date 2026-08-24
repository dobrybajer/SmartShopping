import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
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
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeSelector } from '@/components/ui/ThemeSelector'
import { User, Mail, Calendar, Check, Save, Lock, Globe, Palette } from 'lucide-react'

interface AccountDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AccountDetailsDialog: React.FC<AccountDetailsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { user, userProfile, updateUserProfileName } = useAuth()
  const { t, formatDate } = useTranslation()
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
      setStatusMessage({ type: 'success', text: t('dialogs.account.updateNameSuccess') })
      setTimeout(() => {
        setStatusMessage(null)
      }, 3000)
    } else {
      setStatusMessage({ type: 'error', text: t('toasts.errorOccurred') })
    }
  }

  const createdAtDate = userProfile?.created_at || (user as any)?.created_at

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-lg bg-card border-border text-card-foreground p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">{t('dialogs.account.title')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('dialogs.account.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('dialogs.account.name')}</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dialogs.account.namePlaceholder')}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
              required
            />
          </div>

          {/* Interface Language */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t('dialogs.account.languageTitle')}</span>
            </label>
            <LanguageSwitcher variant="segmented" />
          </div>

          {/* Visual Theme Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('dialogs.account.themeTitle')}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t('dialogs.account.themeDescription')}
              </span>
            </label>
            <ThemeSelector variant="grid" />
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('dialogs.account.email')}</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" /> {t('dialogs.account.readOnly')}
              </span>
            </label>
            <div className="relative">
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-background/40 border-border/80 text-muted-foreground cursor-not-allowed select-none font-mono text-xs pl-3"
              />
            </div>
          </div>

          {/* Created date */}
          {createdAtDate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('dialogs.account.createdDate')}</span>
              </label>
              <div className="p-2.5 rounded-lg bg-background/30 border border-border/60 text-xs text-muted-foreground font-mono">
                {formatDate(createdAtDate)}
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
                statusMessage.type === 'success'
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              {statusMessage.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <DialogFooter className="mt-2 pt-2 border-t border-border sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
            >
              {t('common.close')}
            </Button>

            <Button
              type="submit"
              disabled={isSaving || !name.trim() || name.trim() === (userProfile?.name || '')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 disabled:opacity-40"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('common.save')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

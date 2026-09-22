import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Loader2,
  Smartphone
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const NotificationSettings: React.FC = () => {
  const { household, userProfile, user } = useAuth()
  const { t } = useTranslation()
  const {
    permission,
    isSubscribed,
    isLoading,
    isIosSafariNonPwa,
    notifySelf,
    error,
    checkStatus,
    subscribe,
    unsubscribe,
    sendTestNotification,
    setNotifySelf
  } = useNotificationStore()

  const [testSuccess, setTestSuccess] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleToggle = async () => {
    if (!household?.id) return

    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe(household.id)
    }
  }

  const handleTestNotification = async () => {
    if (!household?.id || isTesting) return
    setIsTesting(true)
    setTestSuccess(false)

    const senderName = userProfile?.name || user?.email?.split('@')[0] || 'Domownik'
    const success = await sendTestNotification(household.id, senderName)
    setIsTesting(false)

    if (success) {
      setTestSuccess(true)
      setTimeout(() => setTestSuccess(false), 3500)
    }
  }

  // Determine status badge details
  const getStatusBadge = () => {
    if (permission === 'denied') {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/15 border-destructive/30 text-destructive text-[11px] font-semibold gap-1.5 px-2.5 py-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          {t('notifications.statusDenied')}
        </Badge>
      )
    }

    if (permission === 'unsupported') {
      return (
        <Badge
          variant="outline"
          className="bg-muted border-border text-muted-foreground text-[11px] font-semibold gap-1.5 px-2.5 py-0.5"
        >
          {t('notifications.statusUnsupported')}
        </Badge>
      )
    }

    if (isSubscribed && permission === 'granted') {
      return (
        <Badge
          variant="outline"
          className="bg-primary/15 border-primary/30 text-primary text-[11px] font-semibold gap-1.5 px-2.5 py-0.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {t('notifications.statusGranted')}
        </Badge>
      )
    }

    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 border-amber-500/30 text-amber-500 text-[11px] font-semibold gap-1.5 px-2.5 py-0.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {t('notifications.statusDefault')}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-background/50 border border-border/80">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
              isSubscribed
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            {isSubscribed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span>{t('notifications.title')}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {t('notifications.subtitle')}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Action Row & Subscribed state */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
        <span className="text-[11px] text-muted-foreground">
          {isSubscribed
            ? t('notifications.deviceRegistered')
            : t('notifications.deviceNotRegistered')}
        </span>

        <Button
          type="button"
          size="sm"
          disabled={isLoading || permission === 'denied' || permission === 'unsupported' || !household}
          onClick={handleToggle}
          variant={isSubscribed ? 'outline' : 'default'}
          className={cn(
            'h-9 px-3 text-xs font-bold transition-all min-h-[44px] sm:min-h-[36px] cursor-pointer',
            isSubscribed
              ? 'border-border bg-card hover:bg-muted text-foreground'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isSubscribed ? (
            <span className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive">
              <BellOff className="w-3.5 h-3.5" />
              <span>{t('notifications.disable')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" />
              <span>{t('notifications.enable')}</span>
            </span>
          )}
        </Button>
      </div>

      {/* "Notify myself" Checkbox Row */}
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/40">
        <div className="flex flex-col gap-0.5 pr-2">
          <label
            htmlFor="notify-self-checkbox"
            className="text-xs font-semibold text-foreground cursor-pointer select-none"
          >
            {t('notifications.notifyMe')}
          </label>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {t('notifications.notifyMeHint')}
          </span>
        </div>
        <Checkbox
          id="notify-self-checkbox"
          checked={notifySelf}
          onCheckedChange={(checked) => setNotifySelf(!!checked)}
          className="h-5 w-5 shrink-0 rounded-md cursor-pointer"
        />
      </div>

      {/* Test Notification Row (if subscribed) */}
      {isSubscribed && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground">
            {testSuccess ? (
              <span className="text-primary font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('notifications.testSent')}
              </span>
            ) : (
              t('notifications.testHint')
            )}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isTesting}
            onClick={handleTestNotification}
            className="h-8 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 cursor-pointer"
          >
            {isTesting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3 text-primary" />
            )}
            <span>{isTesting ? t('notifications.sendingTest') : t('notifications.sendTest')}</span>
          </Button>
        </div>
      )}

      {/* Denied Permission Notice */}
      {permission === 'denied' && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 mt-1">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">{t('notifications.deniedHint')}</p>
        </div>
      )}

      {/* iOS Safari non-PWA Instruction */}
      {isIosSafariNonPwa && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs flex items-start gap-2.5 mt-1">
          <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
          <p className="text-[11px] leading-relaxed">{t('notifications.iosPwaHint')}</p>
        </div>
      )}

      {/* Error Message if any */}
      {error && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

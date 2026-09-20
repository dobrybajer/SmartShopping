import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Button } from '@/components/ui/button'
import { BellRing, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'smartshopping_push_prompt_dismissed'

interface NotificationPromptBannerProps {
  layout?: 'mobile' | 'desktop'
  className?: string
}

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({
  layout = 'desktop',
  className
}) => {
  const { household } = useAuth()
  const { t } = useTranslation()
  const { permission, isSubscribed, isLoading, subscribe } = useNotificationStore()

  const [dismissed, setDismissed] = useState<boolean>(true)

  useEffect(() => {
    // Only check localStorage in client environment
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
      setDismissed(isDismissed)
    }
  }, [])

  // Do not show banner if already dismissed, already subscribed, permission denied/unsupported, or no active household
  if (dismissed || isSubscribed || permission !== 'default' || !household) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
  }

  const handleEnable = async () => {
    if (!household?.id) return
    const success = await subscribe(household.id)
    if (success) {
      handleDismiss()
    }
  }

  return (
    <div
      role="region"
      aria-label="Notification prompt"
      className={cn(
        'rounded-2xl border p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 select-none z-40',
        layout === 'mobile'
          ? 'bg-card/95 border-primary/30 mx-4 mb-3'
          : 'bg-card/90 border-border max-w-3xl mx-auto mb-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner mt-0.5">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
              {t('notifications.banner.title')}
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {t('notifications.banner.description')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-border/40">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground min-h-[44px] sm:min-h-[32px] cursor-pointer"
        >
          {t('notifications.banner.dismissButton')}
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={handleEnable}
          className="h-8 px-4 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md min-h-[44px] sm:min-h-[32px] cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          <span>{t('notifications.banner.enableButton')}</span>
        </Button>
      </div>
    </div>
  )
}

import { create } from 'zustand'
import type { PushPermissionState } from '@/types/notification'
import { notificationService } from '@/services/notificationService'
import { translate, useI18nStore } from '@/i18n'

interface NotificationStoreState {
  permission: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  isIosSafariNonPwa: boolean
  notifySelf: boolean
  error: string | null

  // Actions
  checkStatus: () => Promise<void>
  subscribe: (householdId: string) => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  sendTestNotification: (householdId: string, currentUserName?: string) => Promise<boolean>
  setNotifySelf: (value: boolean) => void
  clearError: () => void
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  permission: 'default',
  isSubscribed: false,
  isLoading: false,
  isIosSafariNonPwa: false,
  notifySelf: notificationService.getNotifySelf ? notificationService.getNotifySelf() : false,
  error: null,

  setNotifySelf: (value: boolean) => {
    notificationService.setNotifySelf?.(value)
    set({ notifySelf: value })
  },

  clearError: () => set({ error: null }),

  checkStatus: async () => {
    try {
      const status = await notificationService.checkStatus()
      set({
        permission: status.permission,
        isSubscribed: status.isSubscribed,
        isIosSafariNonPwa: status.isIosSafariNonPwa,
        error: null
      })
    } catch (err: any) {
      set({ error: err?.message || translate('notifications.errors.statusCheckFailed') })
    }
  },

  subscribe: async (householdId: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }
      const sub = await notificationService.subscribe(householdId)
      const isSubscribed = !!sub
      const permission = notificationService.isSupported()
        ? Notification.permission
        : 'unsupported'

      set({
        isSubscribed,
        permission,
        isLoading: false,
        error: null
      })
      return isSubscribed
    } catch (err: any) {
      console.error('[useNotificationStore] Subscribe error:', err)
      set({
        isLoading: false,
        error: err?.message || translate('notifications.errors.subscribeFailed')
      })
      return false
    }
  },

  unsubscribe: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }
      const success = await notificationService.unsubscribe()
      set({
        isSubscribed: false,
        isLoading: false,
        error: null
      })
      return success
    } catch (err: any) {
      console.error('[useNotificationStore] Unsubscribe error:', err)
      set({
        isLoading: false,
        error: err?.message || translate('notifications.errors.unsubscribeFailed')
      })
      return false
    }
  },

  sendTestNotification: async (householdId: string, currentUserName?: string) => {
    const lang = useI18nStore.getState().language || 'pl'
    const senderName = currentUserName || translate('notifications.defaultSender', {}, lang)

    try {
      const result = await notificationService.notify(
        'TEST_NOTIFICATION',
        {
          senderName
        },
        householdId,
        lang,
        { includeSender: true }
      )

      if (result.sentCount === 0) {
        if (result.totalCount === 0) {
          set({
            error: translate('notifications.errors.noDevices', {}, lang)
          })
        } else {
          set({
            error: translate('notifications.errors.deliveryFailed', {}, lang)
          })
        }
        return false
      }

      set({ error: null })
      return true
    } catch (err: any) {
      console.error('[useNotificationStore] Test notification error:', err)
      set({ error: err?.message || translate('notifications.errors.testFailed', {}, lang) })
      return false
    }
  }
}))

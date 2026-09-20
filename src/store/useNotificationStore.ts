import { create } from 'zustand'
import type { PushPermissionState } from '@/types/notification'
import { notificationService } from '@/services/notificationService'

interface NotificationStoreState {
  permission: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  isIosSafariNonPwa: boolean
  error: string | null

  // Actions
  checkStatus: () => Promise<void>
  subscribe: (householdId: string) => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  sendTestNotification: (householdId: string, currentUserName?: string) => Promise<boolean>
  clearError: () => void
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  permission: 'default',
  isSubscribed: false,
  isLoading: false,
  isIosSafariNonPwa: false,
  error: null,

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
      set({ error: err?.message || 'Failed to check notification status' })
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
        error: err?.message || 'Failed to subscribe to push notifications'
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
        error: err?.message || 'Failed to unsubscribe'
      })
      return false
    }
  },

  sendTestNotification: async (householdId: string, currentUserName: string = 'Ty') => {
    try {
      await notificationService.notify(
        'LIST_ITEM_ADDED',
        {
          listId: 'test-list',
          listName: 'Testowa Lista',
          itemName: 'Mleko Owsiane Barista (Test)',
          addedByName: currentUserName
        },
        householdId
      )
      return true
    } catch (err: any) {
      console.error('[useNotificationStore] Test notification error:', err)
      return false
    }
  }
}))

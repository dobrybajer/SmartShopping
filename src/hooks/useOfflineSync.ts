import { useEffect, useState } from 'react'
import {
  initOfflineQueueAutoSync,
  subscribeToQueueStatus,
  flushOfflineQueue
} from '@/lib/offline/offlineMutationQueue'
import { shoppingListService } from '@/services/shoppingListService'

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    }

    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)

    const unsubscribeQueue = subscribeToQueueStatus((count) => {
      setPendingCount(count)
    })

    const cleanupAutoSync = initOfflineQueueAutoSync(async (mutation) => {
      if (mutation.type === 'TOGGLE_ITEM_CHECK' && mutation.payload.isChecked !== undefined) {
        return shoppingListService.toggleItemChecked(mutation.itemId, mutation.payload.isChecked)
      }
      if (mutation.type === 'UPDATE_ITEM_QUANTITY' && mutation.payload.quantity !== undefined) {
        return shoppingListService.updateItemQuantity(mutation.itemId, mutation.payload.quantity)
      }
      return true
    })

    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
      unsubscribeQueue()
      cleanupAutoSync()
    }
  }, [])

  return {
    isOnline,
    pendingCount,
    syncNow: () =>
      flushOfflineQueue(async (mutation) => {
        if (mutation.type === 'TOGGLE_ITEM_CHECK' && mutation.payload.isChecked !== undefined) {
          return shoppingListService.toggleItemChecked(mutation.itemId, mutation.payload.isChecked)
        }
        if (mutation.type === 'UPDATE_ITEM_QUANTITY' && mutation.payload.quantity !== undefined) {
          return shoppingListService.updateItemQuantity(mutation.itemId, mutation.payload.quantity)
        }
        return true
      })
  }
}

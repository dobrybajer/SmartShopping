import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { isLocalItemEcho, isLocalListEcho } from '@/lib/realtime/localMutationTracker'
import type { ShoppingListItemRealtimeRow } from '@/lib/realtime/activeListDiff'

export interface ActiveListRealtimeHandlers {
  onRefreshRequired: () => void
  onItemUpdated?: (row: ShoppingListItemRealtimeRow) => void
  onItemDeleted?: (itemId: string) => void
}

interface RealtimeChangePayload {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | string
  new?: Record<string, unknown> | null
  old?: Record<string, unknown> | null
}

function triggerRemoteVibration(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([25, 40, 25])
    } catch {
      // Ignore
    }
  }
}

export function processShoppingListRealtimeEvent(
  payload: RealtimeChangePayload,
  handlers: ActiveListRealtimeHandlers
): void {
  const newRow = payload.new as { id?: string } | null | undefined
  const oldRow = payload.old as { id?: string } | null | undefined
  const listId = newRow?.id || oldRow?.id

  if (isLocalListEcho(listId)) {
    return
  }

  triggerRemoteVibration()
  handlers.onRefreshRequired()
}

export function processShoppingListItemRealtimeEvent(
  payload: RealtimeChangePayload,
  handlers: ActiveListRealtimeHandlers
): void {
  const eventType = payload.eventType
  const newRow = payload.new as ShoppingListItemRealtimeRow | null | undefined
  const oldRow = payload.old as { id?: string } | null | undefined
  const itemId = newRow?.id || oldRow?.id

  if (isLocalItemEcho(itemId, newRow as Record<string, unknown> | null | undefined)) {
    // Sync server updated_at silently in memory on local echo without vibration or GET refetch
    if (eventType === 'UPDATE' && newRow?.id && newRow.updated_at && handlers.onItemUpdated) {
      handlers.onItemUpdated(newRow)
    }
    return
  }

  triggerRemoteVibration()

  if (eventType === 'UPDATE' && newRow?.id && handlers.onItemUpdated) {
    handlers.onItemUpdated(newRow)
    return
  }

  if (eventType === 'DELETE' && oldRow?.id && handlers.onItemDeleted) {
    handlers.onItemDeleted(oldRow.id)
    return
  }

  handlers.onRefreshRequired()
}

export function useActiveListRealtime(
  householdId: string | null,
  activeListId: string | null,
  onRealtimeUpdate: (() => void) | ActiveListRealtimeHandlers
) {
  const handlersRef = useRef<ActiveListRealtimeHandlers>(
    typeof onRealtimeUpdate === 'function'
      ? { onRefreshRequired: onRealtimeUpdate }
      : onRealtimeUpdate
  )

  useEffect(() => {
    handlersRef.current =
      typeof onRealtimeUpdate === 'function'
        ? { onRefreshRequired: onRealtimeUpdate }
        : onRealtimeUpdate
  })

  useEffect(() => {
    if (!householdId) return

    const channelName = activeListId
      ? `household_${householdId}_list_${activeListId}`
      : `household_${householdId}_lists`

    let channel = supabase.channel(channelName)

    // 1. Listen for changes to shopping_lists (household level)
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_lists',
        filter: `household_id=eq.${householdId}`
      },
      (payload) => {
        processShoppingListRealtimeEvent(
          payload as RealtimeChangePayload,
          handlersRef.current
        )
      }
    )

    // 2. Listen for changes to shopping_list_items (for selected list)
    if (activeListId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `shopping_list_id=eq.${activeListId}`
        },
        (payload) => {
          processShoppingListItemRealtimeEvent(
            payload as RealtimeChangePayload,
            handlersRef.current
          )
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscription active for channel: ${channelName}`)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, activeListId])
}

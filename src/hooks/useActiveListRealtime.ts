import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useActiveListRealtime(
  householdId: string | null,
  activeListId: string | null,
  onRealtimeUpdate: () => void
) {
  const onRealtimeUpdateRef = useRef(onRealtimeUpdate)
  useEffect(() => {
    onRealtimeUpdateRef.current = onRealtimeUpdate
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
      (_payload) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([25, 40, 25])
          } catch {
            // Ignore
          }
        }
        onRealtimeUpdateRef.current()
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
        (_payload) => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([25, 40, 25])
            } catch {
              // Ignore
            }
          }
          onRealtimeUpdateRef.current()
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

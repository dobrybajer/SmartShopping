import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useActiveListRealtime(
  activeListId: string | null,
  onRealtimeUpdate: () => void
) {
  const onRealtimeUpdateRef = useRef(onRealtimeUpdate)
  useEffect(() => {
    onRealtimeUpdateRef.current = onRealtimeUpdate
  })

  useEffect(() => {
    if (!activeListId) return

    // Create dedicated Realtime channel for active list
    const channel = supabase
      .channel(`active_list_${activeListId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `shopping_list_id=eq.${activeListId}`
        },
        (_payload) => {
          // Haptic feedback notification for real-time changes by household members
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([25, 40, 25])
            } catch {
              // Ignore if not supported
            }
          }

          // Trigger data refresh callback via stable ref
          onRealtimeUpdateRef.current()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscription active for list: ${activeListId}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeListId])
}

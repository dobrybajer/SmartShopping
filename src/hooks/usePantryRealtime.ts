import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function usePantryRealtime(
  householdId: string | null,
  onRealtimeUpdate: () => void
) {
  const onRealtimeUpdateRef = useRef(onRealtimeUpdate)
  useEffect(() => {
    onRealtimeUpdateRef.current = onRealtimeUpdate
  })

  useEffect(() => {
    if (!householdId) return

    const channelName = `pantry_realtime_hh_${householdId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pantry_items',
          filter: `household_id=eq.${householdId}`
        },
        (_payload) => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(25)
            } catch {
              // Ignore
            }
          }
          onRealtimeUpdateRef.current()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Pantry Realtime] Subscribed to ${channelName}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])
}

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useActiveListRealtime(
  activeListId: string | null,
  onRealtimeUpdate: () => void
) {
  useEffect(() => {
    if (!activeListId) return

    // Utwórz dedykowany kanał Realtime dla aktywnej listy
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
          // Powiadomienie wibracją o zmianie w czasie rzeczywistym od domownika
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([25, 40, 25])
            } catch {
              // Ignoruj
            }
          }

          // Wywołaj callback odświeżenia danych
          onRealtimeUpdate()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subskrypcja aktywna dla listy: ${activeListId}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeListId, onRealtimeUpdate])
}

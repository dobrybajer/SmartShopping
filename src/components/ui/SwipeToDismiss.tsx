import React, { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeToDismissProps {
  children: React.ReactNode
  onDismiss: () => void
  threshold?: number
  className?: string
  dismissText?: string
}

export const SwipeToDismiss: React.FC<SwipeToDismissProps> = ({
  children,
  onDismiss,
  threshold = 100,
  className,
  dismissText = 'Usuń'
}) => {
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsSwiping(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    startXRef.current = clientX
    currentXRef.current = clientX
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const diffX = clientX - startXRef.current

    // Swipe lewo (usuwanie): pozwól na ruch w lewo z pewnym ograniczeniem (max -160px)
    if (diffX < 0) {
      setTranslateX(Math.max(diffX, -160))
      currentXRef.current = clientX
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping) return
    setIsSwiping(false)
    const diffX = currentXRef.current - startXRef.current

    if (diffX < -threshold) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50)
        } catch {
          // Ignoruj jeśli nieobsługiwane
        }
      }
      setTranslateX(-500)
      setTimeout(() => {
        onDismiss()
      }, 200)
    } else {
      setTranslateX(0)
    }
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950", className)}>
      {/* Background action container (czerwone tło z ikoną kosza) */}
      <div className="absolute inset-0 bg-red-600 flex items-center justify-end px-6 text-white font-medium text-xs gap-2 select-none">
        <Trash2 className="w-4 h-4 animate-pulse" />
        <span>{dismissText}</span>
      </div>

      {/* Foreground content container */}
      <div
        className={cn(
          "relative bg-zinc-950 transition-transform duration-200 ease-out touch-pan-y",
          isSwiping && "transition-none"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    enableHaptics?: boolean
  }
>(({ className, enableHaptics = true, onCheckedChange, ...props }, ref) => {
  const handleChange = (checked: boolean | 'indeterminate') => {
    if (enableHaptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35)
      } catch {
        // Ignoruj jeśli przeglądarka blokuje vibracje
      }
    }
    if (onCheckedChange) {
      onCheckedChange(checked)
    }
  }

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      onCheckedChange={handleChange}
      className={cn(
        "peer h-6 w-6 shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-black transition-all shadow-sm flex items-center justify-center",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check className="h-4 w-4 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

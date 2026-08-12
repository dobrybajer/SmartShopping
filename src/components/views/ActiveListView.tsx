import React, { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Calendar, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveItem {
  id: string
  name: string
  category: string
  sortOrder: number
  quantity: string
  isChecked: boolean
}

export const ActiveListView: React.FC = () => {
  const [items, setItems] = useState<ActiveItem[]>([
    { id: '1', name: 'Pomidor Malinowy', category: '1. Owoce i Warzywa', sortOrder: 1, quantity: '3 szt', isChecked: false },
    { id: '2', name: 'Szpinak świeży', category: '1. Owoce i Warzywa', sortOrder: 1, quantity: '250 g', isChecked: true },
    { id: '3', name: 'Chleb Żytni Razowy', category: '2. Pieczywo', sortOrder: 2, quantity: '1 szt', isChecked: false },
    { id: '4', name: 'Serek Wiejski 0%', category: '3. Nabiał i Jaja', sortOrder: 3, quantity: '200 g', isChecked: false }
  ])

  const toggleCheck = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    )
  }

  // Grupowanie według alejek (kategorii)
  const categories = Array.from(new Set(items.map((i) => i.category))).sort()

  const checkedCount = items.filter((i) => i.isChecked).length

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Realtime Status Header */}
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Realtime Active</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Dziś</span>
          <Badge variant="default" className="text-[10px] ml-1">
            {checkedCount} / {items.length}
          </Badge>
        </div>
      </div>

      {/* Grouped Categories */}
      <div className="flex flex-col gap-5 mt-1">
        {categories.map((cat) => {
          const categoryItems = items.filter((i) => i.category === cat)

          return (
            <div key={cat} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                {cat}
              </h4>

              <div className="flex flex-col gap-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={cn(
                      "p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]",
                      item.isChecked && "bg-zinc-950/40 border-zinc-900 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.isChecked}
                        onCheckedChange={() => toggleCheck(item.id)}
                        enableHaptics
                      />

                      <span
                        className={cn(
                          "font-semibold text-sm transition-all",
                          item.isChecked
                            ? "line-through text-zinc-500"
                            : "text-zinc-100"
                        )}
                      >
                        {item.name}
                      </span>
                    </div>

                    <span
                      className={cn(
                        "font-mono text-xs px-2.5 py-1 rounded-lg font-bold transition-all",
                        item.isChecked
                          ? "bg-zinc-900 text-zinc-600 line-through"
                          : "bg-emerald-500/10 text-emerald-400"
                      )}
                    >
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {checkedCount === items.length && items.length > 0 && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center gap-2 mt-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
          <h4 className="font-bold text-sm text-emerald-300">Wszystkie zakupy zrobione!</h4>
          <p className="text-xs text-zinc-400">Możesz zarchiwizować tę listę.</p>
        </div>
      )}
    </div>
  )
}

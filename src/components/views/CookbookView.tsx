import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet'
import { Search, Plus, Flame } from 'lucide-react'

export const CookbookView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const tags = ['Wszystkie', 'Śniadanie', 'Obiad', 'Kolacja', 'WOD', 'Redukcja']

  const sampleMeals = [
    {
      id: '1',
      name: 'Omlet białkowy z szpinakiem i fetą',
      category: 'Śniadanie',
      kcal: 420,
      protein: 35,
      carbs: 10,
      fat: 22,
      tags: ['WOD', 'Śniadanie']
    },
    {
      id: '2',
      name: 'Curry z kurczakiem i ryżem jaśminowym',
      category: 'Obiad',
      kcal: 650,
      protein: 48,
      carbs: 72,
      fat: 18,
      tags: ['Obiad', 'Redukcja']
    }
  ]

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Search and Action Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Szukaj przepisu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="h-11 w-11 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl shrink-0">
              <Plus className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nowa Potrawa</SheetTitle>
              <SheetDescription>
                Dodaj przepis do swojej bazy gospodarstwa domowego.
              </SheetDescription>
            </SheetHeader>
            <div className="py-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Nazwa potrawy</label>
                <Input placeholder="np. Owsianka z borówkami" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1 block">Krotki opis / Uwagi</label>
                <Input placeholder="np. Szybkie śniadanie przed treningiem" />
              </div>
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold w-full h-11 rounded-xl mt-2">
                Zapisz Przepis
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filter Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tags.map((tag) => {
          const isSelected = selectedTag === tag || (tag === 'Wszystkie' && !selectedTag)
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === 'Wszystkie' ? null : tag)}
              className="shrink-0"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1 text-xs"
              >
                {tag}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Meals List */}
      <div className="flex flex-col gap-3 mt-1">
        {sampleMeals.map((meal) => (
          <div
            key={meal.id}
            className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-3 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {meal.name}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">{meal.category}</p>
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg text-emerald-400 text-xs font-semibold shrink-0">
                <Flame className="w-3.5 h-3.5" />
                <span>{meal.kcal} kcal</span>
              </div>
            </div>

            {/* Macro Pills & Tags */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[11px] text-zinc-400">
              <div className="flex items-center gap-3 font-mono">
                <span>B: <strong className="text-zinc-200">{meal.protein}g</strong></span>
                <span>W: <strong className="text-zinc-200">{meal.carbs}g</strong></span>
                <span>T: <strong className="text-zinc-200">{meal.fat}g</strong></span>
              </div>

              <div className="flex gap-1">
                {meal.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

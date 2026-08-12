import React, { useState, useEffect } from 'react'
import { useShoppingStore } from '@/store/useShoppingStore'
import { productService } from '@/services/productService'
import type { ProductCategory } from '@/services/productService'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import type { UnitEnum } from '@/types/supabase'

interface AddAdHocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddAdHocSheet: React.FC<AddAdHocSheetProps> = ({ open, onOpenChange }) => {
  const { addAdHocToDraft } = useShoppingStore()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unitType, setUnitType] = useState<UnitEnum>('szt')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [categories, setCategories] = useState<ProductCategory[]>([])

  useEffect(() => {
    if (open) {
      productService.getCategories().then((data) => {
        setCategories(data)
        if (data.length > 0) {
          const chemCategory = data.find((c) => c.name.toLowerCase().includes('chemia'))
          if (chemCategory) {
            setSelectedCategoryId(chemCategory.id)
          }
        }
      })
    }
  }, [open])

  const handleSubmit = () => {
    if (!name.trim() || quantity === '' || quantity <= 0) return

    const categoryObj = categories.find((c) => c.id === selectedCategoryId)

    addAdHocToDraft({
      name: name.trim(),
      unit_type: unitType,
      category_id: selectedCategoryId,
      category_name: categoryObj ? categoryObj.name : 'Inne',
      sort_order: categoryObj ? categoryObj.sort_order : 99,
      quantity: Number(quantity)
    })

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30)
      } catch {
        // Ignoruj
      }
    }

    onOpenChange(false)
    setName('')
    setQuantity(1)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>Dodaj Produkt Ad-hoc</SheetTitle>
          <SheetDescription>
            Szybko dorzuć pozycję spoza bazy przepisów (np. chemia domowa, papier toaletowy).
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Nazwa Produktu *</label>
            <Input
              placeholder="np. Papier toaletowy 8-pak"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-300 block mb-1">Ilość</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-300 block mb-1">Jednostka</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitEnum)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="szt">Sztuka (szt)</option>
                <option value="g">Gram (g)</option>
                <option value="ml">Mililitr (ml)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Kategoria / Aleja w sklepie</label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Wybierz kategorię --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sort_order}. {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || quantity === ''}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Wrzuć Ad-hoc do Koszyka</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

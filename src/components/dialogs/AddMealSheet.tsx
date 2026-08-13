import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { mealService } from '@/services/mealService'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Save, Sparkles, Home, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddMealSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMealCreated?: () => void
}

interface IngredientInput {
  product_id: string
  product_name: string
  unit_type: 'g' | 'ml' | 'szt'
  base_quantity: number
  is_pantry_item: boolean
}

export const AddMealSheet: React.FC<AddMealSheetProps> = ({
  open,
  onOpenChange,
  onMealCreated
}) => {
  const { household } = useAuth()
  const [mealType, setMealType] = useState<'Household' | 'Global'>('Household')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [preparationSteps, setPreparationSteps] = useState('')
  const [comments, setComments] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [ingredients, setIngredients] = useState<IngredientInput[]>([])

  // State dodawania nowego składnika do listy
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [selectedProductUnit, setSelectedProductUnit] = useState<'g' | 'ml' | 'szt'>('g')
  const [quantityInput, setQuantityInput] = useState<number | ''>(100)
  const [isPantryInput, setIsPantryInput] = useState(false)

  // Dodawanie nowego produktu ad-hoc do bazy produktów podczas składania potrawy
  const [newProductName, setNewProductName] = useState('')
  const [newProductUnit, setNewProductUnit] = useState<'g' | 'ml' | 'szt'>('g')
  const [newProductKcal, setNewProductKcal] = useState<number | ''>(0)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && household) {
      productService.getProducts(household.id).then(setAvailableProducts)
      productService.getCategories().then(setCategories)
    }
  }, [open, household])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleAddIngredient = () => {
    if (!selectedProductId || quantityInput === '' || quantityInput <= 0) return
    const prod = availableProducts.find((p) => p.id === selectedProductId)
    if (!prod) return

    setIngredients([
      ...ingredients,
      {
        product_id: prod.id,
        product_name: prod.name,
        unit_type: prod.unit_type,
        base_quantity: Number(quantityInput),
        is_pantry_item: isPantryInput
      }
    ])

    setSelectedProductId('')
    setSelectedProductName('')
    setQuantityInput(100)
    setIsPantryInput(false)
  }

  const handleCreateNewProduct = async () => {
    if (!newProductName.trim() || !household) return
    setIsSubmitting(true)
    const newProd = await productService.createProduct({
      household_id: household.id,
      name: newProductName.trim(),
      unit_type: newProductUnit,
      kcal_per_100: Number(newProductKcal || 0)
    })
    setIsSubmitting(false)

    if (newProd) {
      setAvailableProducts([...availableProducts, newProd])
      setSelectedProductId(newProd.id)
      setNewProductName('')
      setIsCreatingProduct(false)
    }
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!name.trim() || !household) return
    setIsSubmitting(true)

    const result = await mealService.createMeal({
      household_id: household.id,
      type: mealType,
      name: name.trim(),
      description: description.trim() || undefined,
      preparation_steps: preparationSteps.trim() || undefined,
      comments: comments.trim() || undefined,
      tags: tags,
      ingredients: ingredients.map((ing) => ({
        product_id: ing.product_id,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item
      }))
    })

    setIsSubmitting(false)

    if (result) {
      if (onMealCreated) onMealCreated()
      onOpenChange(false)
      // Reset form
      setMealType('Household')
      setName('')
      setDescription('')
      setPreparationSteps('')
      setComments('')
      setTags([])
      setIngredients([])
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dodaj Nowy Przepis</SheetTitle>
          <SheetDescription>
            Zdefiniuj potrawę i jej składniki w swojej książce kucharskiej.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 flex flex-col gap-4 text-xs">
          {/* Wybór typu / widoczności przepisu */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <label className="font-bold text-zinc-200 text-xs flex items-center justify-between">
              <span>Dostępność przepisu</span>
              <span className="text-[10px] text-zinc-500 font-normal">Gdzie ma być widoczny?</span>
            </label>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setMealType('Household')}
                className={cn(
                  "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  mealType === 'Household'
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30 shadow-xs"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Gospodarstwo</span>
                </div>
                <span className="text-[10px] text-zinc-500 leading-tight">
                  Tylko dla domowników ({household?.name || 'Gospodarstwo'})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMealType('Global')}
                className={cn(
                  "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  mealType === 'Global'
                    ? "bg-sky-500/10 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/30 shadow-xs"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Globalny</span>
                </div>
                <span className="text-[10px] text-zinc-500 leading-tight">
                  Dostępny we wszystkich gospodarstwach
                </span>
              </button>
            </div>
          </div>

          {/* Nazwa */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Nazwa Przepisu *</label>
            <Input
              placeholder="np. Szakszuka z pomidorami i fetą"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Opis */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Krótki opis</label>

            <Input
              placeholder="np. Pożywne śniadanie białkowo-tłuszczowe"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Tagi (np. WOD, Redukcja)</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Dodaj tag i naciśnij Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button onClick={handleAddTag} variant="outline" className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-950/50 hover:text-red-400"
                    onClick={() => handleRemoveTag(t)}
                  >
                    {t} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Składniki Section */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
            <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
              Składniki ({ingredients.length})
            </h4>

            {/* Składniki dodane */}
            {ingredients.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-zinc-200">{ing.product_name}</span>
                      {ing.is_pantry_item && (
                        <span className="text-[10px] text-zinc-500 ml-1.5">(Spiżarnia)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">
                        {ing.base_quantity} {ing.unit_type}
                      </span>
                      <button
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formularz dodawania składnika */}
            {!isCreatingProduct ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Wybierz produkt z bazy:</span>
                  <button
                    onClick={() => setIsCreatingProduct(true)}
                    className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Nowy produkt +</span>
                  </button>
                </div>

                <ProductAutocomplete
                  value={selectedProductName}
                  onChange={(val) => {
                    setSelectedProductName(val)
                    const match = availableProducts.find((p) => p.name.toLowerCase() === val.toLowerCase())
                    if (match) {
                      setSelectedProductId(match.id)
                      setSelectedProductUnit(match.unit_type)
                    } else {
                      setSelectedProductId('')
                    }
                  }}
                  products={availableProducts}
                  categories={categories}
                  onSelectProduct={(p) => {
                    setSelectedProductId(p.id)
                    setSelectedProductName(p.name)
                    setSelectedProductUnit(p.unit_type)
                  }}
                  placeholder="Szukaj składnika z bazy..."
                />

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder={`Ilość (${selectedProductUnit})`}
                      value={quantityInput}
                      onChange={(e) =>
                        setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="h-10 font-mono pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 font-mono pointer-events-none">
                      {selectedProductUnit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 bg-zinc-950 rounded-xl border border-zinc-800 h-10 shrink-0">
                    <Checkbox
                      id="pantry-check"
                      checked={isPantryInput}
                      onCheckedChange={(c) => setIsPantryInput(!!c)}
                    />
                    <label htmlFor="pantry-check" className="text-[11px] text-zinc-400 cursor-pointer">
                      Spiżarnia
                    </label>
                  </div>

                  <Button
                    onClick={handleAddIngredient}
                    disabled={!selectedProductId}
                    className="h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Tworzenie nowego produktu od ręki */
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Dodaj Nowy Produkt do Bazy</span>
                  <button
                    onClick={() => setIsCreatingProduct(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    Anuluj
                  </button>
                </div>

                <Input
                  placeholder="Nazwa produktu (np. Mleko Owsiane)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />

                <div className="flex gap-2">
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value as any)}
                    className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="ml">Mililitr (ml)</option>
                    <option value="szt">Sztuka (szt)</option>
                  </select>

                  <Input
                    type="number"
                    placeholder="Kcal / 100g (np. 50)"
                    value={newProductKcal}
                    onChange={(e) =>
                      setNewProductKcal(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="h-10 font-mono"
                  />
                </div>

                <Button
                  onClick={handleCreateNewProduct}
                  disabled={!newProductName.trim() || isSubmitting}
                  className="h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold mt-1"
                >
                  Zapisz i Wybierz
                </Button>
              </div>
            )}
          </div>

          {/* Kroki przygotowania */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Kroki przygotowania</label>
            <textarea
              placeholder="np. 1. Podsmaż cebulę. 2. Dodaj pomidory i jajka..."
              value={preparationSteps}
              onChange={(e) => setPreparationSteps(e.target.value)}
              className="w-full min-h-[80px] p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Komentarze */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Komentarze i Uwagi</label>
            <Input
              placeholder="np. Najlepiej smakuje z świeżą kolendrą"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg"
          >
            <Save className="w-5 h-5" />
            <span>Zapisz Przepis w Bazie</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

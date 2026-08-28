import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { mealService } from '@/services/mealService'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { ProductFormSheet } from '@/components/dialogs/ProductFormSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  unit_type: 'g' | 'ml' | 'pcs'
  base_quantity: number
  is_pantry_item: boolean
}

export const AddMealSheet: React.FC<AddMealSheetProps> = ({
  open,
  onOpenChange,
  onMealCreated
}) => {
  const { household } = useAuth()
  const { isDesktop } = useDeviceLayout()
  const { t, formatUnit, formatQuantity } = useTranslation()
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

  // New ingredient state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [selectedProductUnit, setSelectedProductUnit] = useState<'g' | 'ml' | 'pcs'>('g')
  const [quantityInput, setQuantityInput] = useState<number | ''>(100)

  // Product modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!household) return
      const [allProds, allCats] = await Promise.all([
        productService.getProducts(household.id),
        productService.getCategories()
      ])
      setAvailableProducts(allProds)
      setCategories(allCats)
    }
    if (open) {
      loadData()
    }
  }, [open, household])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleAddIngredient = () => {
    if (!selectedProductId || !quantityInput || quantityInput <= 0) return

    setIngredients([
      ...ingredients,
      {
        product_id: selectedProductId,
        product_name: selectedProductName,
        unit_type: selectedProductUnit,
        base_quantity: Number(quantityInput),
        is_pantry_item: false
      }
    ])

    // Reset ingredient form
    setSelectedProductId('')
    setSelectedProductName('')
    setQuantityInput(100)
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleProductSaved = (newProduct: Product) => {
    setAvailableProducts((prev) => {
      if (prev.some((p) => p.id === newProduct.id)) return prev
      return [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name))
    })
    setSelectedProductId(newProduct.id)
    setSelectedProductName(newProduct.name)
    setSelectedProductUnit(newProduct.unit_type as any)
    window.dispatchEvent(new CustomEvent('smartshopping_refresh_products'))
    setIsAddProductOpen(false)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !household) return
    setIsSubmitting(true)

    const result = await mealService.createMeal({
      household_id: mealType === 'Household' ? household.id : null,
      type: mealType,
      name: name.trim(),
      description: description.trim() || undefined,
      preparation_steps: preparationSteps.trim() || undefined,
      comments: comments.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
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

  const headerContent = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
          {t('dialogs.mealForm.addTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('cookbook.subtitle')}
        </p>
      </div>
    </div>
  )

  const bodyContent = (
    <div className="py-4 flex flex-col gap-4 text-xs flex-1 overflow-y-auto px-6 scrollbar-thin">
      {/* Meal Scope Selection */}
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-background border border-border">
        <label className="font-bold text-foreground text-xs flex items-center justify-between">
          <span>{t('dialogs.mealForm.categoryLabel')}</span>
          <span className="text-[10px] text-muted-foreground font-normal">{t('dialogs.mealForm.scopeLabel')}</span>
        </label>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => setMealType('Household')}
            className={cn(
              "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
              mealType === 'Household'
                ? "bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/30 shadow-xs"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Home className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{t('navigation.households')}</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {household?.name || t('navigation.households')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMealType('Global')}
            className={cn(
              "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
              mealType === 'Global'
                ? "bg-sky-500/10 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/30 shadow-xs"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{t('common.global')}</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {t('products.globalProduct')}
            </span>
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="font-semibold text-foreground block mb-1">{t('dialogs.mealForm.nameLabel')} *</label>
        <Input
          placeholder={t('dialogs.mealForm.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Description */}
      <div>
        <label className="font-semibold text-foreground block mb-1">{t('dialogs.mealForm.descriptionLabel')}</label>
        <Input
          placeholder={t('dialogs.mealForm.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="font-semibold text-foreground block mb-1">{t('dialogs.mealForm.tagsLabel')}</label>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder={t('dialogs.mealForm.tagsPlaceholder')}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              }
            }}
          />
          <Button onClick={handleAddTag} variant="outline" className="shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                onClick={() => handleRemoveTag(t)}
              >
                {t} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Ingredients Section */}
      <div className="p-3 rounded-xl bg-background border border-border flex flex-col gap-3">
        <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
          {t('cookbook.ingredients')} ({ingredients.length})
        </h4>

        {/* Added ingredients */}
        {ingredients.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground">{ing.product_name}</span>
                  {ing.is_pantry_item && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">({t('cookbook.pantryItem')})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary font-bold">
                    {formatQuantity(ing.base_quantity, ing.unit_type)}
                  </span>
                  <button
                    onClick={() => handleRemoveIngredient(idx)}
                    className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add ingredient form */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">{t('dialogs.mealForm.productSelectLabel')}:</span>
            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('products.addProduct')} +</span>
            </button>
          </div>

          <ProductAutocomplete
            value={selectedProductName}
            onChange={(val) => {
              setSelectedProductName(val)
              const match = availableProducts.find((p) => p.name.toLowerCase() === val.toLowerCase())
              if (match) {
                setSelectedProductId(match.id)
                setSelectedProductUnit(match.unit_type as any)
              } else {
                setSelectedProductId('')
              }
            }}
            products={availableProducts}
            categories={categories}
            onSelectProduct={(p) => {
              setSelectedProductId(p.id)
              setSelectedProductName(p.name)
              setSelectedProductUnit(p.unit_type as any)
            }}
            placeholder={t('products.searchPlaceholder')}
          />

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder={`${t('dialogs.mealForm.quantityLabel')} (${formatUnit(selectedProductUnit)})`}
                value={quantityInput}
                onChange={(e) =>
                  setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="h-10 font-mono pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono pointer-events-none">
                {formatUnit(selectedProductUnit)}
              </span>
            </div>

            <Button
              type="button"
              onClick={handleAddIngredient}
              disabled={!selectedProductId}
              className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preparation steps */}
      <div>
        <label className="font-semibold text-foreground block mb-1">{t('dialogs.mealForm.stepsLabel')}</label>
        <textarea
          placeholder={t('dialogs.mealForm.stepsPlaceholder')}
          value={preparationSteps}
          onChange={(e) => setPreparationSteps(e.target.value)}
          className="w-full min-h-[80px] p-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* Notes & Comments */}
      <div>
        <label className="font-semibold text-foreground block mb-1">{t('dialogs.mealForm.commentsLabel')}</label>
        <Input
          placeholder={t('dialogs.mealForm.commentsPlaceholder')}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>
    </div>
  )

  const footerContent = (
    <div className="p-4 border-t border-border bg-card/90 shrink-0">
      <Button
        onClick={handleSubmit}
        disabled={!name.trim() || isSubmitting}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-5 h-5" />
        <span>{t('dialogs.mealForm.submitAdd')}</span>
      </Button>
    </div>
  )

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="max-w-lg w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <DialogTitle className="sr-only">{t('dialogs.mealForm.addTitle')}</DialogTitle>
              <DialogDescription className="sr-only">{t('cookbook.subtitle')}</DialogDescription>
              {headerContent}
            </DialogHeader>
            {bodyContent}
            {footerContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[92vh] bg-card border-t border-border text-foreground rounded-t-3xl flex flex-col p-0 overflow-hidden">
            <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <SheetTitle className="sr-only">{t('dialogs.mealForm.addTitle')}</SheetTitle>
              <SheetDescription className="sr-only">{t('cookbook.subtitle')}</SheetDescription>
              {headerContent}
            </SheetHeader>
            {bodyContent}
            {footerContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Product modal on top */}
      <ProductFormSheet
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        initialName={selectedProductName}
        onProductSaved={handleProductSaved}
      />
    </>
  )
}

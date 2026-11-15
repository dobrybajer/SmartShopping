import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/store/useToastStore'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { mealService, type MealCategory } from '@/services/mealService'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import {
  convertKitchenUnitToBaseQuantity,
  type KitchenUnit
} from '@/lib/calculations/kitchenUnits'

export interface MealFormIngredientInput {
  product_id: string
  product_name: string
  unit_type: 'g' | 'ml' | 'pcs'
  base_quantity: number
  input_quantity?: number
  input_unit?: KitchenUnit
  is_pantry_item: boolean
  is_general?: boolean
  reference_product_id?: string | null
  reference_product_name?: string
}

interface UseMealFormParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealToEdit?: MealWithIngredients | null
  onMealCreated?: () => void
  onMealSaved?: () => void
}

export function useMealForm({
  open,
  onOpenChange,
  mealToEdit = null,
  onMealCreated,
  onMealSaved
}: UseMealFormParams) {
  const { household } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [preparationSteps, setPreparationSteps] = useState('')
  const [comments, setComments] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [mealCategories, setMealCategories] = useState<MealCategory[]>([])
  const [ingredients, setIngredients] = useState<MealFormIngredientInput[]>([])

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [selectedProductUnit, setSelectedProductUnit] = useState<'g' | 'ml' | 'pcs'>('g')
  const [selectedInputUnit, setSelectedInputUnit] = useState<KitchenUnit>('g')
  const [quantityInput, setQuantityInput] = useState<number | ''>(100)

  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetFormFields = useCallback(() => {
    setName('')
    setDescription('')
    setPreparationSteps('')
    setComments('')
    setCategoryId(null)
    setTags([])
    setTagInput('')
    setIngredients([])
    setSelectedProductId('')
    setSelectedProductName('')
    setSelectedProductUnit('g')
    setSelectedInputUnit('g')
    setQuantityInput(100)
  }, [])

  useEffect(() => {
    async function loadData() {
      if (!household) return
      const [allProds, allCats, allMealCats] = await Promise.all([
        productService.getProducts(household.id),
        productService.getCategories(),
        mealService.getMealCategories ? mealService.getMealCategories() : Promise.resolve([])
      ])
      setAvailableProducts(allProds)
      setCategories(allCats)
      setMealCategories(allMealCats)
    }
    if (open) {
      loadData()
    }
  }, [open, household])

  useEffect(() => {
    if (!open) return
    if (mealToEdit) {
      setName(mealToEdit.name || '')
      setDescription(mealToEdit.description || '')
      setPreparationSteps(mealToEdit.preparation_steps || '')
      setComments(mealToEdit.comments || '')
      setCategoryId(mealToEdit.category_id ?? null)
      setTags(mealToEdit.tags ? [...mealToEdit.tags] : [])
      setTagInput('')
      setIngredients(
        (mealToEdit.ingredients || [])
          .filter((ing) => Boolean(ing.product_id || ing.product?.id))
          .map((ing) => {
            const unit = ing.product?.unit_type || 'g'
            return {
              product_id: ing.product_id || ing.product?.id || '',
              product_name: ing.product?.name || '',
              unit_type: unit,
              base_quantity: ing.base_quantity,
              input_quantity: ing.base_quantity,
              input_unit: unit,
              is_pantry_item: Boolean(ing.is_pantry_item),
              is_general: Boolean(ing.product?.is_general),
              reference_product_id: ing.reference_product_id ?? ing.reference_product?.id ?? null,
              reference_product_name: ing.reference_product?.name
            }
          })
      )
      setSelectedProductId('')
      setSelectedProductName('')
      setSelectedProductUnit('g')
      setSelectedInputUnit('g')
      setQuantityInput(100)
    } else {
      resetFormFields()
    }
  }, [open, mealToEdit, resetFormFields])

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

  const handleInputUnitChange = (newUnit: KitchenUnit) => {
    setSelectedInputUnit(newUnit)
    if (newUnit !== 'g' && newUnit !== 'ml' && newUnit !== 'dag' && quantityInput === 100) {
      setQuantityInput(1)
    } else if ((newUnit === 'g' || newUnit === 'ml') && quantityInput === 1) {
      setQuantityInput(100)
    }
  }

  const handleAddIngredient = () => {
    if (!selectedProductId || !quantityInput || quantityInput <= 0) return

    const selectedProd = availableProducts.find((p) => p.id === selectedProductId)
    const isGeneral = !!selectedProd?.is_general
    const childVariants = isGeneral
      ? availableProducts.filter((p) => p.parent_id === selectedProductId)
      : []
    const defaultRef = childVariants.length > 0 ? childVariants[0] : null

    const rawQty = Number(quantityInput)
    const convertedBaseQty = convertKitchenUnitToBaseQuantity(
      rawQty,
      selectedInputUnit,
      selectedProductUnit
    )
    const isKitchenUnitUsed = selectedInputUnit !== selectedProductUnit

    setIngredients([
      ...ingredients,
      {
        product_id: selectedProductId,
        product_name: selectedProductName,
        unit_type: selectedProductUnit,
        base_quantity: convertedBaseQty,
        input_quantity: isKitchenUnitUsed ? rawQty : undefined,
        input_unit: isKitchenUnitUsed ? selectedInputUnit : undefined,
        is_pantry_item: false,
        is_general: isGeneral,
        reference_product_id: defaultRef ? defaultRef.id : null,
        reference_product_name: defaultRef ? defaultRef.name : undefined
      }
    ])

    setSelectedProductId('')
    setSelectedProductName('')
    setSelectedInputUnit('g')
    setQuantityInput(100)
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleChangeReferenceProduct = (index: number, newRefId: string) => {
    const newRefProd = availableProducts.find((p) => p.id === newRefId)
    setIngredients((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              reference_product_id: newRefId || null,
              reference_product_name: newRefProd?.name
            }
          : item
      )
    )
  }

  const handleProductNameChange = (val: string) => {
    setSelectedProductName(val)
    const match = availableProducts.find((p) => p.name.toLowerCase() === val.toLowerCase())
    if (match) {
      setSelectedProductId(match.id)
      setSelectedProductUnit(match.unit_type)
      setSelectedInputUnit(match.unit_type)
      setQuantityInput(match.unit_type === 'pcs' ? 1 : 100)
    } else {
      setSelectedProductId('')
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id)
    setSelectedProductName(product.name)
    setSelectedProductUnit(product.unit_type)
    setSelectedInputUnit(product.unit_type)
    setQuantityInput(product.unit_type === 'pcs' ? 1 : 100)
  }

  const handleProductSaved = (newProduct: Product) => {
    setAvailableProducts((prev) => {
      if (prev.some((p) => p.id === newProduct.id)) return prev
      return [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name))
    })
    setSelectedProductId(newProduct.id)
    setSelectedProductName(newProduct.name)
    setSelectedProductUnit(newProduct.unit_type)
    setSelectedInputUnit(newProduct.unit_type)
    setQuantityInput(newProduct.unit_type === 'pcs' ? 1 : 100)
    window.dispatchEvent(new CustomEvent('smartshopping_refresh_products'))
    setIsAddProductOpen(false)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !household) return
    setIsSubmitting(true)

    const payload = {
      household_id: household.id,
      type: 'Household' as const,
      name: name.trim(),
      description: description.trim() || undefined,
      preparation_steps: preparationSteps.trim() || undefined,
      comments: comments.trim() || undefined,
      category_id: categoryId,
      tags: tags.length > 0 ? tags : undefined,
      ingredients: ingredients.map((ing) => ({
        product_id: ing.product_id,
        base_quantity: ing.base_quantity,
        is_pantry_item: ing.is_pantry_item,
        reference_product_id: ing.reference_product_id || null
      }))
    }

    const result = mealToEdit
      ? await mealService.updateMeal(mealToEdit.id, payload)
      : await mealService.createMeal(payload)

    setIsSubmitting(false)

    if (!result) {
      toast.error(t('toasts.errorOccurred'))
      return
    }

    toast.success(t('toasts.saved'))
    onMealSaved?.()
    onMealCreated?.()
    onOpenChange(false)
    resetFormFields()
  }

  return {
    household,
    isEditing: Boolean(mealToEdit),
    name,
    setName,
    description,
    setDescription,
    preparationSteps,
    setPreparationSteps,
    comments,
    setComments,
    categoryId,
    setCategoryId,
    tags,
    tagInput,
    setTagInput,
    availableProducts,
    categories,
    mealCategories,
    ingredients,
    selectedProductId,
    selectedProductName,
    selectedProductUnit,
    selectedInputUnit,
    setSelectedInputUnit: handleInputUnitChange,
    quantityInput,
    setQuantityInput,
    isAddProductOpen,
    setIsAddProductOpen,
    isSubmitting,
    handleAddTag,
    handleRemoveTag,
    handleAddIngredient,
    handleRemoveIngredient,
    handleChangeReferenceProduct,
    handleProductNameChange,
    handleSelectProduct,
    handleProductSaved,
    handleSubmit
  }
}

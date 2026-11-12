import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import type { UnitEnum } from '@/types/supabase'

interface UseProductFormParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  productToEdit?: Product | null
  initialName?: string
  onProductSaved?: (product: Product) => void
}

export function useProductForm({
  open,
  onOpenChange,
  productToEdit = null,
  initialName = '',
  onProductSaved
}: UseProductFormParams) {
  const { household } = useAuth()
  const { t, formatUnit, formatQuantity } = useTranslation()
  const isEditing = !!productToEdit

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [parentProducts, setParentProducts] = useState<Product[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [unitType, setUnitType] = useState<UnitEnum>('pcs')
  const [isGeneral, setIsGeneral] = useState(false)
  const [parentId, setParentId] = useState<string>('')
  const [isFood, setIsFood] = useState(true)

  const [kcal, setKcal] = useState<number | ''>(0)
  const [protein, setProtein] = useState<number | ''>(0)
  const [carbs, setCarbs] = useState<number | ''>(0)
  const [fat, setFat] = useState<number | ''>(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function loadData() {
      const [catData, prodData] = await Promise.all([
        productService.getCategories(household?.id),
        productService.getProducts(household?.id)
      ])
      setCategories(catData)
      setParentProducts(
        prodData.filter((p) => p.is_general && (!productToEdit || p.id !== productToEdit.id))
      )
    }
    if (open) {
      loadData()
    }
  }, [household?.id, open, productToEdit])

  useEffect(() => {
    if (!open) return
    if (productToEdit) {
      setName(productToEdit.name)
      setCategoryId(productToEdit.category_id || '')
      setUnitType(productToEdit.unit_type)
      setIsGeneral(!!productToEdit.is_general)
      setParentId(productToEdit.parent_id || '')
      const hasMacros =
        (productToEdit.kcal_per_100 ?? 0) > 0 || (productToEdit.protein_per_100 ?? 0) > 0
      setIsFood(hasMacros)
      setKcal(productToEdit.kcal_per_100 ?? 0)
      setProtein(productToEdit.protein_per_100 ?? 0)
      setCarbs(productToEdit.carbs_per_100 ?? 0)
      setFat(productToEdit.fat_per_100 ?? 0)
    } else {
      setName(initialName ? initialName.trim() : '')
      setCategoryId('')
      setUnitType('pcs')
      setIsGeneral(false)
      setParentId('')
      setIsFood(true)
      setKcal(0)
      setProtein(0)
      setCarbs(0)
      setFat(0)
    }
    setErrorMsg('')
  }, [open, productToEdit, initialName])

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as Parameters<typeof t>[0]
      const translated = t(key)
      return translated !== key ? translated : catName
    },
    [t]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg(t('dialogs.productForm.nameLabel'))
      return
    }

    if (!isEditing && !household) {
      setErrorMsg(t('dialogs.households.switchHousehold'))
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const resolveMacroVal = (val: number | '', fallbackNull: null | undefined) =>
        isGeneral ? fallbackNull : isFood ? (typeof val === 'number' ? val : 0) : fallbackNull

      if (isEditing && productToEdit) {
        const updated = await productService.updateProduct(productToEdit.id, {
          name: name.trim(),
          category_id: categoryId === '' ? null : Number(categoryId),
          unit_type: unitType,
          is_general: isGeneral,
          parent_id: isGeneral ? null : parentId ? parentId : null,
          kcal_per_100: resolveMacroVal(kcal, null),
          protein_per_100: resolveMacroVal(protein, null),
          carbs_per_100: resolveMacroVal(carbs, null),
          fat_per_100: resolveMacroVal(fat, null)
        })

        if (updated) {
          onProductSaved?.(updated)
          onOpenChange(false)
        } else {
          setErrorMsg(t('toasts.errorOccurred'))
        }
      } else if (household) {
        const created = await productService.createProduct({
          household_id: household.id,
          name: name.trim(),
          category_id: categoryId === '' ? undefined : Number(categoryId),
          unit_type: unitType,
          is_general: isGeneral,
          parent_id: isGeneral ? null : parentId ? parentId : null,
          kcal_per_100: resolveMacroVal(kcal, undefined),
          protein_per_100: resolveMacroVal(protein, undefined),
          carbs_per_100: resolveMacroVal(carbs, undefined),
          fat_per_100: resolveMacroVal(fat, undefined)
        })

        if (created) {
          onProductSaved?.(created)
          onOpenChange(false)
        } else {
          setErrorMsg(t('toasts.errorOccurred'))
        }
      }
    } catch {
      setErrorMsg(t('toasts.errorOccurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitSuffix = unitType === 'pcs' ? formatQuantity(1, 'pcs') : `100 ${formatUnit(unitType)}`

  return {
    isEditing,
    categories,
    parentProducts,
    name,
    setName,
    categoryId,
    setCategoryId,
    unitType,
    setUnitType,
    isGeneral,
    setIsGeneral,
    parentId,
    setParentId,
    isFood,
    setIsFood,
    kcal,
    setKcal,
    protein,
    setProtein,
    carbs,
    setCarbs,
    fat,
    setFat,
    isSubmitting,
    errorMsg,
    unitSuffix,
    getCategoryLabel,
    handleSubmit
  }
}


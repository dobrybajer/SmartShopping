import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePantryStore } from '@/store/usePantryStore'
import { useShallow } from 'zustand/react/shallow'
import { useTranslation } from '@/i18n'
import { productService, type Product, type ProductCategory } from '@/services/productService'
import { toast } from '@/store/useToastStore'
import type { UnitEnum } from '@/types/supabase'
import { getNextQuantity } from '@/lib/utils'

interface UseAddPantryItemFormParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialProduct?: Product | null
}

export function useAddPantryItemForm({
  open,
  onOpenChange,
  onSuccess,
  initialProduct
}: UseAddPantryItemFormParams) {
  const { household } = useAuth()
  const { pantryMapByProductId, pantryMapByAdHocName, addOrIncrementItem } = usePantryStore(
    useShallow((state) => ({
      pantryMapByProductId: state.pantryMapByProductId,
      pantryMapByAdHocName: state.pantryMapByAdHocName,
      addOrIncrementItem: state.addOrIncrementItem
    }))
  )
  const { t, formatQuantity } = useTranslation()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unitType, setUnitType] = useState<UnitEnum>('pcs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)
  const [expirationDate, setExpirationDate] = useState<string>('')
  const [mergeMode, setMergeMode] = useState<'increment' | 'set'>('increment')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const loadData = useCallback(async () => {
    if (!household?.id) return
    const [cats, prods] = await Promise.all([
      productService.getCategories(household.id),
      productService.getProducts(household.id)
    ])
    setCategories(cats)
    setProducts(prods)
  }, [household])

  useEffect(() => {
    if (!open) return
    loadData()
    if (initialProduct) {
      setName(initialProduct.name)
      setSelectedProductId(initialProduct.id)
      setUnitType(initialProduct.unit_type)
      setSelectedCategoryId(initialProduct.category_id || undefined)
    } else {
      setName('')
      setSelectedProductId(undefined)
      setUnitType('pcs')
      setSelectedCategoryId(undefined)
    }
    setQuantity(1)
    setExpirationDate('')
    setMergeMode('increment')
  }, [open, loadData, initialProduct])

  const existingPantryItem =
    (selectedProductId ? pantryMapByProductId[selectedProductId] : null) ||
    (name.trim() ? pantryMapByAdHocName[name.trim().toLowerCase()] : null)

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id)
    setName(product.name)
    setUnitType(product.unit_type)
    if (product.category_id) {
      setSelectedCategoryId(product.category_id)
    }
  }

  const handleIncrease = () => {
    const current = typeof quantity === 'number' ? quantity : 1
    setQuantity(getNextQuantity(current, unitType, 'increase'))
  }

  const handleDecrease = () => {
    const current = typeof quantity === 'number' ? quantity : 1
    const next = getNextQuantity(current, unitType, 'decrease')
    if (next > 0) {
      setQuantity(next)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!household?.id || !name.trim() || quantity === '' || quantity <= 0) return

    setIsSubmitting(true)
    try {
      let resolvedProdId = selectedProductId
      let resolvedCatId = selectedCategoryId

      if (!resolvedProdId) {
        const match = products.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        )
        if (match) {
          resolvedProdId = match.id
          resolvedCatId = match.category_id || resolvedCatId
        } else {
          const newProd = await productService.createProduct({
            household_id: household.id,
            name: name.trim(),
            unit_type: unitType,
            category_id: resolvedCatId || null,
            type: 'Household',
            is_ad_hoc: false
          })
          if (newProd) {
            resolvedProdId = newProd.id
            resolvedCatId = newProd.category_id || resolvedCatId
          }
        }
      }

      const nowIso = new Date().toISOString()

      const success = await addOrIncrementItem(
        {
          household_id: household.id,
          product_id: resolvedProdId || null,
          ad_hoc_name: resolvedProdId ? null : name.trim(),
          category_id: resolvedCatId || null,
          quantity: Number(quantity),
          unit_type: unitType,
          last_purchased_at: nowIso,
          last_verified_at: nowIso,
          expiration_date: expirationDate ? expirationDate : undefined
        },
        mergeMode
      )

      if (success) {
        toast.success(
          mergeMode === 'increment' && existingPantryItem
            ? t('pantry.addDialog.mergeOptionIncrease', {
                quantity: formatQuantity(Number(quantity), unitType)
              })
            : `${t('pantry.inStock')}: ${name}`
        )
        onSuccess?.()
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as Parameters<typeof t>[0]
      const translated = t(key)
      return translated !== key ? translated : catName
    },
    [t]
  )

  return {
    name,
    setName,
    quantity,
    setQuantity,
    unitType,
    setUnitType,
    selectedCategoryId,
    setSelectedCategoryId,
    setSelectedProductId,
    expirationDate,
    setExpirationDate,
    mergeMode,
    setMergeMode,
    isSubmitting,
    categories,
    products,
    existingPantryItem,
    handleSelectProduct,
    handleIncrease,
    handleDecrease,
    handleSubmit,
    getCategoryLabel
  }
}


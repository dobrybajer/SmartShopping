import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import { productService, type Product } from '@/services/productService'
import { resolveCategoriesWithSettings } from '@/lib/calculations/categorySorting'
import type { ResolvedCategory } from '@/types/category'
import { useCategoryStore } from '@/store/useCategoryStore'
import { usePantryStore } from '@/store/usePantryStore'
import { useShallow } from 'zustand/react/shallow'
import { toast } from '@/store/useToastStore'

export function useProductsViewController(options?: {
  listenGlobalRefresh?: boolean
  useServiceCategoriesFallback?: boolean
}) {
  const { household } = useAuth()
  const { t } = useTranslation()
  const { categoriesByHousehold, loadCategories } = useCategoryStore(
    useShallow((state) => ({
      categoriesByHousehold: state.categoriesByHousehold,
      loadCategories: state.loadCategories
    }))
  )
  const pantryMapByProductId = usePantryStore((state) => state.pantryMapByProductId)

  const [products, setProducts] = useState<Product[]>([])
  const [fallbackCategories, setFallbackCategories] = useState<ResolvedCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Household' | 'Global'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [pantryProduct, setPantryProduct] = useState<Product | null>(null)
  const [isAddPantryOpen, setIsAddPantryOpen] = useState(false)

  const householdKey = household?.id || 'global'
  const storeCategories = useMemo(
    () => categoriesByHousehold[householdKey] || [],
    [categoriesByHousehold, householdKey]
  )

  const categories = useMemo(
    () => (storeCategories.length > 0 ? storeCategories : fallbackCategories),
    [storeCategories, fallbackCategories]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prodsData, , serviceCats] = await Promise.all([
        productService.getProducts(household?.id),
        loadCategories(household?.id),
        options?.useServiceCategoriesFallback ? productService.getCategories() : Promise.resolve([])
      ])
      setProducts(prodsData)
      if (serviceCats.length > 0) {
        setFallbackCategories(resolveCategoriesWithSettings(serviceCats, []))
      }
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }, [household?.id, loadCategories, options?.useServiceCategoriesFallback])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!options?.listenGlobalRefresh) return
    const handleRefresh = () => {
      void loadData()
    }
    window.addEventListener('smartshopping_refresh_products', handleRefresh)
    return () => window.removeEventListener('smartshopping_refresh_products', handleRefresh)
  }, [loadData, options?.listenGlobalRefresh])

  const getCategoryLabel = useCallback(
    (catName: string) => {
      const key = `categories.${catName}` as never
      return t(key) !== key ? t(key) : catName
    },
    [t]
  )

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((cat) => map.set(cat.id, cat.name))
    return map
  }, [categories])

  const productMap = useMemo(() => {
    const map = new Map<string, Product>()
    products.forEach((p) => map.set(p.id, p))
    return map
  }, [products])

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((p) => {
      if (p.parent_id) {
        counts.set(p.parent_id, (counts.get(p.parent_id) || 0) + 1)
      }
    })
    return counts
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return products.filter((prod) => {
      const isGlobal = prod.type === 'Global' || !prod.household_id
      const isHousehold = !isGlobal

      if (scopeFilter === 'Household' && !isHousehold) return false
      if (scopeFilter === 'Global' && !isGlobal) return false
      if (selectedCategoryId !== null && prod.category_id !== selectedCategoryId) return false

      if (query) {
        const rawCatName = prod.category_id ? categoryMap.get(prod.category_id) || '' : ''
        const translatedCatName = getCategoryLabel(rawCatName).toLowerCase()
        const matchesName = prod.name.toLowerCase().includes(query)
        const matchesCat = rawCatName.toLowerCase().includes(query) || translatedCatName.includes(query)
        if (!matchesName && !matchesCat) return false
      }

      return true
    })
  }, [products, scopeFilter, selectedCategoryId, searchQuery, categoryMap, getCategoryLabel])

  const totalCount = products.length
  const householdCount = products.filter((p) => p.type !== 'Global' && p.household_id).length
  const globalCount = totalCount - householdCount

  const handleOpenAdd = useCallback(() => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }, [])

  const handleOpenEdit = useCallback((prod: Product) => {
    setEditingProduct(prod)
    setIsFormOpen(true)
  }, [])

  const handleProductSaved = useCallback((savedProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === savedProduct.id)
      return exists ? prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)) : [savedProduct, ...prev]
    })
  }, [])

  const requestDelete = useCallback(
    (product: Product) => {
      const count = childCounts.get(product.id) || 0
      if (count > 0) {
        toast.error(t('products.deleteBlockedHasChildren', { name: product.name, count }))
        return
      }
      setProductToDelete(product)
    },
    [childCounts, t]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return
    const count = childCounts.get(productToDelete.id) || 0
    if (count > 0) {
      toast.error(t('products.deleteBlockedHasChildren', { name: productToDelete.name, count }))
      setProductToDelete(null)
      return
    }

    setIsDeleting(true)
    try {
      const success = await productService.deleteProduct(productToDelete.id)
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
        setProductToDelete(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }, [productToDelete, childCounts, t])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setScopeFilter('all')
    setSelectedCategoryId(null)
  }, [])

  return {
    household,
    products,
    categories,
    loading,
    searchQuery,
    setSearchQuery,
    scopeFilter,
    setScopeFilter,
    selectedCategoryId,
    setSelectedCategoryId,
    isFormOpen,
    setIsFormOpen,
    editingProduct,
    productToDelete,
    setProductToDelete,
    isDeleting,
    pantryProduct,
    setPantryProduct,
    isAddPantryOpen,
    setIsAddPantryOpen,
    categoryMap,
    productMap,
    childCounts,
    filteredProducts,
    totalCount,
    householdCount,
    globalCount,
    pantryMapByProductId,
    loadData,
    getCategoryLabel,
    handleOpenAdd,
    handleOpenEdit,
    handleProductSaved,
    requestDelete,
    handleConfirmDelete,
    clearFilters
  }
}

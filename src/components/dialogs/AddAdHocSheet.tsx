import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { productService } from '@/services/productService'
import type { Product, ProductCategory } from '@/services/productService'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Database, Sparkles } from 'lucide-react'
import type { UnitEnum } from '@/types/supabase'
import { cn } from '@/lib/utils'

interface AddAdHocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddAdHocSheet: React.FC<AddAdHocSheetProps> = ({ open, onOpenChange }) => {
  const { household } = useAuth()
  const { isDesktop } = useDeviceLayout()
  const { addAdHocToDraft } = useShoppingStore()
  const { t, formatUnit } = useTranslation()
  
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [unitType, setUnitType] = useState<UnitEnum>('pcs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)
  
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // Confirmation modal for adding new product to DB
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)

  const loadData = React.useCallback(async () => {
    const cats = await productService.getCategories(household?.id)
    setCategories(cats)

    if (household) {
      const prods = await productService.getProducts(household.id)
      setProducts(prods as any)
    }

    setSelectedCategoryId((prev) => {
      if (prev !== undefined) return prev
      const householdCat = cats.find((c) => c.name.toLowerCase().includes('household'))
      return householdCat ? householdCat.id : undefined
    })
  }, [household])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id)
    setName(product.name)
    setUnitType(product.unit_type as UnitEnum)
    if (product.category_id) {
      setSelectedCategoryId(product.category_id)
    }
  }

  const commitToDraft = (productId?: string) => {
    const categoryObj = categories.find((c) => c.id === selectedCategoryId)
    const prodId = productId || selectedProductId

    addAdHocToDraft({
      product_id: prodId,
      name: name.trim(),
      unit_type: unitType,
      category_id: selectedCategoryId,
      category_name: categoryObj ? categoryObj.name : 'other',
      sort_order: categoryObj ? categoryObj.sort_order : 99,
      quantity: Number(quantity)
    })

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30)
      } catch {
        // Ignore
      }
    }

    onOpenChange(false)
    setName('')
    setSelectedProductId(undefined)
    setQuantity(1)
  }

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim() || quantity === '' || quantity <= 0) return

    const trimmed = name.trim().toLowerCase()
    const existingProduct = products.find((p) => p.name.toLowerCase() === trimmed)

    if (!existingProduct && !selectedProductId) {
      setIsConfirmModalOpen(true)
    } else {
      commitToDraft(existingProduct?.id || selectedProductId)
    }
  }

  const handleSaveToDatabaseAndDraft = async () => {
    if (!household || !name.trim()) {
      commitToDraft()
      setIsConfirmModalOpen(false)
      return
    }

    setIsSavingToDb(true)
    const newProduct = await productService.createProduct({
      household_id: household.id,
      name: name.trim(),
      unit_type: unitType,
      category_id: selectedCategoryId || null,
      type: 'Household',
      is_ad_hoc: true
    })
    setIsSavingToDb(false)

    if (newProduct) {
      setProducts((prev) => [...prev, newProduct as any])
    }

    setIsConfirmModalOpen(false)
    commitToDraft(newProduct?.id)
  }

  const handleAddOnlyToDraft = () => {
    setIsConfirmModalOpen(false)
    commitToDraft()
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  const headerContent = (
    <div className="flex items-center gap-2 text-foreground">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground leading-tight">
          {t('dialogs.adHoc.title')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('dialogs.adHoc.subtitle')}
        </p>
      </div>
    </div>
  )

  const bodyContent = (
    <form
      onSubmit={handleFormSubmit}
      className={cn(
        'py-4 px-6 flex flex-col gap-4 text-xs flex-1 min-h-[380px]',
        isDesktop ? 'overflow-visible' : 'overflow-y-auto scrollbar-thin'
      )}
    >
      {/* Product Name */}
      <div className="relative">
        <label className="font-semibold text-foreground block mb-1.5">
          {t('dialogs.adHoc.nameLabel')} *
        </label>
        <ProductAutocomplete
          value={name}
          onChange={(val) => {
            setName(val)
            const matched = products.find((p) => p.name.toLowerCase() === val.trim().toLowerCase())
            if (matched) {
              setSelectedProductId(matched.id)
              if (matched.category_id) {
                setSelectedCategoryId(matched.category_id)
              }
            } else {
              setSelectedProductId(undefined)
            }
          }}
          products={products}
          categories={categories}
          onSelectProduct={handleSelectProduct}
          placeholder={t('dialogs.adHoc.namePlaceholder')}
          listClassName="max-h-[260px]"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-semibold text-foreground block mb-1.5">{t('dialogs.adHoc.quantityLabel')}</label>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value === '' ? '' : Number(e.target.value))
            }
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 300)
            }}
            className="font-mono h-11 text-xs bg-background border-input text-foreground focus-visible:ring-primary rounded-xl"
          />
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-1.5">{t('dialogs.adHoc.unitLabel')}</label>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value as UnitEnum)}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="pcs" className="bg-card text-foreground">pcs ({formatUnit('pcs')})</option>
            <option value="g" className="bg-card text-foreground">g ({formatUnit('g')})</option>
            <option value="ml" className="bg-card text-foreground">ml ({formatUnit('ml')})</option>
          </select>
        </div>
      </div>

      <div>
        <label className="font-semibold text-foreground block mb-1.5">
          {t('dialogs.adHoc.categoryLabel')}
        </label>
        <select
          value={selectedCategoryId || ''}
          onChange={(e) =>
            setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)
          }
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="" className="bg-card text-foreground">-- {t('common.select')} --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="bg-card text-foreground">
              {c.sort_order}. {getCategoryLabel(c.name)}
            </option>
          ))}
        </select>
      </div>
    </form>
  )

  const footerContent = (
    <div className="p-4 border-t border-border bg-card/90 shrink-0">
      <Button
        type="button"
        onClick={() => handleFormSubmit()}
        disabled={!name.trim() || quantity === ''}
        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span>{t('dialogs.adHoc.submitButton')}</span>
      </Button>
    </div>
  )

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="max-w-md w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl min-h-[520px] max-h-[85vh] flex flex-col overflow-hidden"
          >
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <DialogTitle className="sr-only">{t('dialogs.adHoc.title')}</DialogTitle>
              <DialogDescription className="sr-only">{t('dialogs.adHoc.subtitle')}</DialogDescription>
              {headerContent}
            </DialogHeader>
            {bodyContent}
            {footerContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[85vh] max-h-[92dvh] flex flex-col p-0 bg-card border-t border-border text-foreground rounded-t-3xl overflow-hidden">
            <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <SheetTitle className="sr-only">{t('dialogs.adHoc.title')}</SheetTitle>
              <SheetDescription className="sr-only">{t('dialogs.adHoc.subtitle')}</SheetDescription>
              {headerContent}
            </SheetHeader>
            {bodyContent}
            {footerContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 mx-auto sm:mx-0">
              <Database className="w-5 h-5" />
            </div>
            <DialogTitle className="text-foreground">{t('dialogs.productForm.addTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('dialogs.adHoc.saveToCatalogPrompt', { name: name.trim() })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
            <Button
              onClick={handleSaveToDatabaseAndDraft}
              disabled={isSavingToDb}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSavingToDb ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>{t('dialogs.adHoc.saveAndAdd')}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleAddOnlyToDraft}
              className="w-full h-10 border-border bg-card text-muted-foreground hover:bg-muted rounded-xl cursor-pointer"
            >
              {t('draft.adHocItem')} {t('common.only')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

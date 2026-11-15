import React from 'react'
import { useTranslation } from '@/i18n'
import type { Product, ProductCategory } from '@/services/productService'
import type { MealFormIngredientInput } from '@/hooks/useMealForm'
import {
  formatKitchenUnitConversionPreview,
  getAvailableKitchenUnitsForProduct,
  type KitchenUnit
} from '@/lib/calculations/kitchenUnits'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Sparkles, Scale } from 'lucide-react'

interface MealIngredientsSectionProps {
  ingredients: MealFormIngredientInput[]
  availableProducts: Product[]
  categories: ProductCategory[]
  selectedProductId: string
  selectedProductName: string
  selectedProductUnit: 'g' | 'ml' | 'pcs'
  selectedInputUnit?: KitchenUnit
  onInputUnitChange?: (unit: KitchenUnit) => void
  quantityInput: number | ''
  onQuantityChange: (val: number | '') => void
  onProductNameChange: (val: string) => void
  onSelectProduct: (product: Product) => void
  onAddIngredient: () => void
  onRemoveIngredient: (index: number) => void
  onChangeReferenceProduct: (index: number, refProductId: string) => void
  onOpenAddProduct: () => void
}

export const MealIngredientsSection: React.FC<MealIngredientsSectionProps> = ({
  ingredients,
  availableProducts,
  categories,
  selectedProductId,
  selectedProductName,
  selectedProductUnit,
  selectedInputUnit,
  onInputUnitChange,
  quantityInput,
  onQuantityChange,
  onProductNameChange,
  onSelectProduct,
  onAddIngredient,
  onRemoveIngredient,
  onChangeReferenceProduct,
  onOpenAddProduct
}) => {
  const { t, formatUnit, formatQuantity } = useTranslation()

  const activeInputUnit: KitchenUnit = selectedInputUnit || selectedProductUnit
  const availableUnitOptions = getAvailableKitchenUnitsForProduct(selectedProductUnit)
  const conversionPreview = formatKitchenUnitConversionPreview(
    quantityInput,
    activeInputUnit,
    selectedProductUnit
  )

  return (
    <div className="p-3 rounded-xl bg-background border border-border flex flex-col gap-3">
      <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
        {t('cookbook.ingredients')} ({ingredients.length})
      </h4>

      {ingredients.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground truncate">{ing.product_name}</span>
                  {ing.is_general && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                      {t('products.generalBadge')}
                    </span>
                  )}
                  {ing.is_pantry_item && (
                    <span className="text-[10px] text-muted-foreground">({t('cookbook.pantryItem')})</span>
                  )}
                </div>

                {ing.is_general && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{t('cookbook.macroVia')}</span>
                    {availableProducts.filter((p) => p.parent_id === ing.product_id).length > 0 ? (
                      <select
                        value={ing.reference_product_id || ''}
                        onChange={(e) => onChangeReferenceProduct(idx, e.target.value)}
                        className="text-[11px] font-semibold bg-background border border-primary/40 text-primary rounded-md px-1.5 py-0.5 focus:outline-none"
                      >
                        {availableProducts
                          .filter((p) => p.parent_id === ing.product_id)
                          .map((child) => (
                            <option key={child.id} value={child.id} className="bg-card text-foreground">
                              {child.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium italic">
                        {t('cookbook.noReferenceWarning')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-primary font-bold">
                    {formatQuantity(ing.base_quantity, ing.unit_type)}
                  </span>
                  {ing.input_unit && ing.input_quantity && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({ing.input_quantity} {t(`units.kitchen.short.${ing.input_unit}` as never)})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveIngredient(idx)}
                  className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">{t('dialogs.mealForm.productSelectLabel')}:</span>
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t('products.addProduct')} +</span>
          </button>
        </div>

        <ProductAutocomplete
          value={selectedProductName}
          onChange={onProductNameChange}
          products={availableProducts}
          categories={categories}
          onSelectProduct={onSelectProduct}
          placeholder={t('products.searchPlaceholder')}
        />

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              step="any"
              placeholder={`${t('dialogs.mealForm.quantityLabel')} (${formatUnit(selectedProductUnit)})`}
              value={quantityInput}
              onChange={(e) => onQuantityChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-10 font-mono"
            />
          </div>

          {availableUnitOptions.length > 1 && onInputUnitChange ? (
            <select
              aria-label={t('dialogs.mealForm.kitchenUnitSelectLabel')}
              value={activeInputUnit}
              onChange={(e) => onInputUnitChange(e.target.value as KitchenUnit)}
              className="h-10 rounded-lg bg-card border border-border px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {availableUnitOptions.map((opt) => (
                <option key={opt.unit} value={opt.unit} className="bg-card text-foreground">
                  {t(opt.labelKey as never)}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-10 px-3 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground font-mono shrink-0">
              {formatUnit(selectedProductUnit)}
            </div>
          )}

          <Button
            type="button"
            onClick={onAddIngredient}
            disabled={!selectedProductId}
            className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {conversionPreview.isConverted && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t('dialogs.mealForm.convertedToBaseHint', {
                quantity: formatQuantity(conversionPreview.baseQuantity, conversionPreview.baseUnit)
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

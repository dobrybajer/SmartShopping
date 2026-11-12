import React from 'react'
import { useTranslation } from '@/i18n'
import type { Product } from '@/services/productService'
import type { PantryItemWithDetails } from '@/types/pantry'
import { calculatePantryFreshness } from '@/lib/calculations/pantryCalculations'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Package,
  Home,
  Globe,
  Edit2,
  Trash2,
  Scale,
  Flame,
  Warehouse,
  FolderTree
} from 'lucide-react'

interface ProductCatalogCardProps {
  product: Product
  variant: 'mobile' | 'desktop'
  categoryName: string | null
  isNonFood: boolean
  parentName?: string | null
  childVariantCount: number
  pantryItem?: PantryItemWithDetails
  onOpenPantry: (product: Product) => void
  onEdit: (product: Product) => void
  onRequestDelete: (product: Product) => void
}

export const ProductCatalogCard: React.FC<ProductCatalogCardProps> = ({
  product,
  variant,
  categoryName,
  isNonFood,
  parentName,
  childVariantCount,
  pantryItem,
  onOpenPantry,
  onEdit,
  onRequestDelete
}) => {
  const { t, formatUnit, formatQuantity } = useTranslation()
  const isDesktop = variant === 'desktop'
  const isGlobal = product.type === 'Global' || !product.household_id
  const isHousehold = !isGlobal

  const kcal = product.kcal_per_100 ?? 0
  const protein = product.protein_per_100 ?? 0
  const carbs = product.carbs_per_100 ?? 0
  const fat = product.fat_per_100 ?? 0
  const hasMacros = kcal > 0 || protein > 0 || carbs > 0 || fat > 0
  const unitLabel =
    product.unit_type === 'pcs' ? formatQuantity(1, 'pcs') : `100 ${formatUnit(product.unit_type)}`

  const freshness = pantryItem
    ? calculatePantryFreshness(
        pantryItem.last_purchased_at,
        isNonFood,
        product.name,
        formatQuantity(pantryItem.quantity, pantryItem.unit_type),
        pantryItem.last_verified_at
      )
    : null

  return (
    <div
      className={cn(
        'rounded-2xl bg-card border transition-all flex flex-col shadow-sm group',
        isDesktop ? 'p-4 justify-between gap-3 duration-200 hover:shadow-lg' : 'p-3.5 gap-2.5',
        isHousehold
          ? isDesktop
            ? 'border-border hover:border-primary/50 hover:bg-muted/50'
            : 'border-border hover:border-primary/40'
          : 'border-border hover:border-border/80'
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isDesktop && (
              <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
                <Package className="w-4 h-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0 gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4
                  className={cn(
                    'text-sm text-foreground group-hover:text-primary transition-colors truncate',
                    isDesktop ? 'font-bold' : 'font-semibold'
                  )}
                >
                  {product.name}
                </h4>

                {product.is_general && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1"
                  >
                    <FolderTree className="w-2.5 h-2.5" />
                    <span>{t('products.generalBadge')}</span>
                  </Badge>
                )}

                {isGlobal ? (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium flex items-center gap-1"
                  >
                    <Globe className="w-2.5 h-2.5" />
                    <span>{t('common.global')}</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1"
                  >
                    <Home className="w-2.5 h-2.5" />
                    <span>{t('navigation.households')}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center shrink-0',
              isDesktop ? 'gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity' : 'gap-1'
            )}
          >
            <button
              type="button"
              onClick={() => onOpenPantry(product)}
              className={cn(
                'rounded-lg transition-colors cursor-pointer',
                isDesktop ? 'p-1.5' : 'p-2',
                pantryItem
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title={pantryItem ? t('pantry.managePantry') : t('pantry.quickAdd')}
              aria-label={pantryItem ? t('pantry.managePantry') : t('pantry.quickAdd')}
            >
              <Warehouse className="w-3.5 h-3.5" />
            </button>

            {isHousehold && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  className={cn(
                    'text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer',
                    isDesktop ? 'p-1.5' : 'p-2'
                  )}
                  title={t('common.edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(product)}
                  className={cn(
                    'text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer',
                    isDesktop ? 'p-1.5' : 'p-2'
                  )}
                  title={t('common.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Meta Badges Row */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {categoryName && (
              <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border truncate max-w-[130px]">
                {categoryName}
              </span>
            )}

            {product.parent_id && (
              <span className="text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                ↳ {parentName || t('products.parentProduct')}
              </span>
            )}

            {product.is_general && (
              <span className="text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-md border border-primary/20">
                {t('products.variantsCount', { count: childVariantCount })}
              </span>
            )}

            <span className="flex items-center gap-1 font-mono text-muted-foreground">
              <Scale className="w-3 h-3 text-muted-foreground" />
              <span>{formatUnit(product.unit_type)}</span>
            </span>
          </div>

          {pantryItem && freshness && (
            <button
              type="button"
              onClick={() => onOpenPantry(product)}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer shadow-xs',
                freshness.badgeBgClass,
                freshness.colorClass
              )}
              title={t(freshness.messageKey as never, freshness.translationParams as never)}
            >
              <Warehouse className="w-3 h-3 shrink-0" />
              <span>{formatQuantity(pantryItem.quantity, pantryItem.unit_type)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer: Macros or General Note */}
      {product.is_general ? (
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
            <FolderTree className="w-3 h-3 text-primary shrink-0" />
            <span>{t('products.generalProductNote')}</span>
          </span>
        </div>
      ) : hasMacros ? (
        <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400 font-bold shrink-0">
            <Flame className="w-3 h-3" />
            <span>
              {Math.round(kcal)} {t('common.kcal')}
            </span>
            <span className="text-[10px] font-normal text-amber-400/70">/{unitLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium ml-auto">
            <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span className="text-blue-400 font-bold">{t('common.proteinShort')}</span>
              <span className="text-foreground font-semibold">{protein}g</span>
            </span>
            <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span className="text-amber-400 font-bold">{t('common.carbsShort')}</span>
              <span className="text-foreground font-semibold">{carbs}g</span>
            </span>
            <span className="text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <span className="text-rose-400 font-bold">{t('common.fatShort')}</span>
              <span className="text-foreground font-semibold">{fat}g</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-[10px] text-muted-foreground font-mono">
            {t('products.noNutritionalInfo')}
          </span>
        </div>
      )}
    </div>
  )
}


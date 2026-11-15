import React from 'react'
import type { MealWithIngredients } from '@/store/useShoppingStore'
import { useTranslation } from '@/i18n'
import { Pencil, Trash2 } from 'lucide-react'

interface CookbookMealActionsProps {
  meal: MealWithIngredients
  isGlobal: boolean
  onEdit?: (e: React.MouseEvent, meal: MealWithIngredients) => void
  onDelete: (e: React.MouseEvent, meal: MealWithIngredients) => void
}

export const CookbookMealActions: React.FC<CookbookMealActionsProps> = ({
  meal,
  isGlobal,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {!isGlobal && onEdit && (
        <button
          type="button"
          onClick={(e) => onEdit(e, meal)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
          title={t('cookbook.editMeal')}
          aria-label={t('cookbook.editMeal')}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => onDelete(e, meal)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
        title={t('common.delete')}
        aria-label={t('common.delete')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

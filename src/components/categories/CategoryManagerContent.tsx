import React from 'react'
import { useTranslation } from '@/i18n'
import { useCategoryManagerController } from '@/hooks/useCategoryManagerController'
import { CategoryRowCard } from '@/components/categories/CategoryRowCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import { Plus, X, Sparkles, AlertCircle } from 'lucide-react'

interface CategoryManagerContentProps {
  householdId: string
  onClose?: () => void
}

export const CategoryManagerContent: React.FC<CategoryManagerContentProps> = ({ householdId }) => {
  const { t } = useTranslation()
  const ctrl = useCategoryManagerController(householdId)

  return (
    <div className="flex flex-col gap-4 max-h-[75vh] overflow-hidden">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t('categoryManager.subtitle')}
      </p>

      <form onSubmit={ctrl.handleAddCategory} className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={ctrl.newCategoryName}
              onChange={(e) => {
                ctrl.setNewCategoryName(e.target.value)
                if (ctrl.addError) ctrl.setAddError(null)
              }}
              placeholder={t('categoryManager.newCategoryPlaceholder')}
              className="h-10 text-sm bg-card border-border pr-8 focus-visible:ring-primary"
              disabled={ctrl.isAdding}
            />
            {ctrl.newCategoryName && (
              <button
                type="button"
                onClick={() => ctrl.setNewCategoryName('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-10 px-4 shrink-0 font-medium cursor-pointer"
            disabled={!ctrl.newCategoryName.trim() || ctrl.isAdding}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('categoryManager.addCustomCategory')}
          </Button>
        </div>
        {ctrl.addError && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-0.5 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {ctrl.addError}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-4 scrollbar-thin">
        {ctrl.categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-card/50 rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            {t('categoryManager.emptyList')}
          </div>
        ) : (
          ctrl.categories.map((cat, index) => (
            <CategoryRowCard
              key={cat.id}
              cat={cat}
              index={index}
              isFirst={index === 0}
              isLast={index === ctrl.categories.length - 1}
              isEditing={ctrl.editingCategoryId === cat.id}
              isDragOver={ctrl.dragOverIndex === index}
              editingName={ctrl.editingName}
              setEditingName={ctrl.setEditingName}
              editError={ctrl.editError}
              displayName={ctrl.getDisplayName(cat)}
              onDragStart={ctrl.handleDragStart}
              onDragOver={ctrl.handleDragOver}
              onDrop={ctrl.handleDrop}
              onDragEnd={ctrl.handleDragEnd}
              onMove={ctrl.handleMove}
              onToggleVisibility={ctrl.handleToggleVisibility}
              onStartEdit={ctrl.startEdit}
              onSaveEdit={ctrl.saveEdit}
              onCancelEdit={ctrl.cancelEdit}
              onRequestDelete={ctrl.setDeletingCategory}
            />
          ))
        )}
      </div>

      {ctrl.deletingCategory && (
        <ConfirmDeleteDialog
          open={!!ctrl.deletingCategory}
          onOpenChange={(open) => !open && ctrl.setDeletingCategory(null)}
          title={t('categoryManager.deleteConfirmTitle')}
          itemName={ctrl.deletingCategory.name}
          targetName={t('categoryManager.deleteConfirmDescription')}
          onConfirm={ctrl.confirmDelete}
          isDeleting={ctrl.isDeleting}
        />
      )}
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { useCategoryStore } from '@/store/useCategoryStore'
import {
  validateCategoryName,
  resolveCategoriesWithSettings,
  DEFAULT_PRODUCT_CATEGORIES
} from '@/lib/calculations/categorySorting'
import type { ResolvedCategory } from '@/types/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryManagerContentProps {
  householdId: string
  onClose?: () => void
}

export const CategoryManagerContent: React.FC<CategoryManagerContentProps> = ({
  householdId
}) => {
  const { t } = useTranslation()
  const {
    categoriesByHousehold,
    loadCategories,
    subscribeRealtime,
    reorderCategories,
    toggleVisibility,
    createCustomCategory,
    updateCustomCategory,
    deleteCustomCategory
  } = useCategoryStore()

  // Load categories and subscribe to realtime changes
  useEffect(() => {
    if (householdId && loadCategories) {
      loadCategories(householdId)
    }
  }, [householdId, loadCategories])

  useEffect(() => {
    if (householdId && subscribeRealtime) {
      const unsubscribe = subscribeRealtime(householdId)
      return () => {
        unsubscribe()
      }
    }
  }, [householdId, subscribeRealtime])

  // Always show default global categories for new or unconfigured households
  const categories =
    categoriesByHousehold[householdId] && categoriesByHousehold[householdId].length > 0
      ? categoriesByHousehold[householdId]
      : resolveCategoriesWithSettings(DEFAULT_PRODUCT_CATEGORIES, [])

  // Add category state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  // Delete category state
  const [deletingCategory, setDeletingCategory] = useState<ResolvedCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // HTML5 Drag & drop state
  const draggedIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Helper for localized name
  const getDisplayName = (cat: ResolvedCategory) => {
    if (cat.custom_name) return cat.custom_name
    if (cat.is_global) {
      const translated = t(`categories.${cat.name}` as any)
      return translated !== `categories.${cat.name}` ? translated : cat.name
    }
    return cat.name
  }

  // Trigger haptic feedback
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40)
      } catch {
        // Ignore vibration errors
      }
    }
  }

  // Handle move up / move down
  const handleMove = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= categories.length) return
    triggerHaptic()

    const newOrder = [...categories]
    const [moved] = newOrder.splice(currentIndex, 1)
    newOrder.splice(targetIndex, 0, moved)

    const orderedIds = newOrder.map((c) => c.id)
    await reorderCategories(householdId, orderedIds)
  }

  // Handle Drag & Drop
  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const startIndex = draggedIndexRef.current
    setDragOverIndex(null)
    draggedIndexRef.current = null

    if (startIndex === null || startIndex === dropIndex) return
    triggerHaptic()

    const newOrder = [...categories]
    const [moved] = newOrder.splice(startIndex, 1)
    newOrder.splice(dropIndex, 0, moved)

    const orderedIds = newOrder.map((c) => c.id)
    await reorderCategories(householdId, orderedIds)
  }

  const handleDragEnd = () => {
    draggedIndexRef.current = null
    setDragOverIndex(null)
  }

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    const validation = validateCategoryName(newCategoryName, categories)
    if (!validation.valid && validation.error) {
      setAddError(t(`categoryManager.validation.${validation.error}` as any))
      return
    }

    setIsAdding(true)
    const result = await createCustomCategory(householdId, newCategoryName.trim())
    setIsAdding(false)

    if (result) {
      setNewCategoryName('')
      triggerHaptic()
    } else {
      setAddError(t('common.error'))
    }
  }

  // Handle Edit Category
  const startEdit = (cat: ResolvedCategory) => {
    if (cat.is_global) return
    setEditingCategoryId(cat.id)
    setEditingName(cat.name)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingCategoryId(null)
    setEditingName('')
    setEditError(null)
  }

  const saveEdit = async (categoryId: number) => {
    setEditError(null)
    const validation = validateCategoryName(editingName, categories, categoryId)
    if (!validation.valid && validation.error) {
      setEditError(t(`categoryManager.validation.${validation.error}` as any))
      return
    }

    const success = await updateCustomCategory(householdId, categoryId, editingName.trim())
    if (success) {
      cancelEdit()
      triggerHaptic()
    } else {
      setEditError(t('common.error'))
    }
  }

  // Handle Delete Category
  const confirmDelete = async () => {
    if (!deletingCategory || deletingCategory.is_global) return
    setIsDeleting(true)
    const success = await deleteCustomCategory(householdId, deletingCategory.id)
    setIsDeleting(false)

    if (success) {
      setDeletingCategory(null)
      triggerHaptic()
    }
  }

  return (
    <div className="flex flex-col gap-4 max-h-[75vh] overflow-hidden">
      {/* 1. Description & Subtitle */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t('categoryManager.subtitle')}
      </p>

      {/* 2. Add Custom Category Form */}
      <form onSubmit={handleAddCategory} className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value)
                if (addError) setAddError(null)
              }}
              placeholder={t('categoryManager.newCategoryPlaceholder')}
              className="h-10 text-sm bg-card border-border pr-8 focus-visible:ring-primary"
              disabled={isAdding}
            />
            {newCategoryName && (
              <button
                type="button"
                onClick={() => setNewCategoryName('')}
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
            disabled={!newCategoryName.trim() || isAdding}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('categoryManager.addCustomCategory')}
          </Button>
        </div>
        {addError && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-0.5 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {addError}
          </p>
        )}
      </form>

      {/* 3. Ordered Category Aisle List */}
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-4 scrollbar-thin">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-card/50 rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            {t('categoryManager.emptyList')}
          </div>
        ) : (
          categories.map((cat, index) => {
            const isEditing = editingCategoryId === cat.id
            const isDragOver = dragOverIndex === index
            const isFirst = index === 0
            const isLast = index === categories.length - 1

            return (
              <div
                key={cat.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group flex items-center gap-2.5 p-2.5 rounded-xl border bg-card/80 transition-all select-none',
                  cat.is_hidden
                    ? 'opacity-60 bg-muted/20 border-border/50'
                    : 'border-border hover:border-border/80 shadow-xs',
                  isDragOver && 'border-primary bg-primary/10 scale-[1.01]'
                )}
              >
                {/* Drag Handle (Desktop) */}
                <div
                  className="cursor-grab active:cursor-grabbing text-muted-foreground/60 group-hover:text-muted-foreground p-1 shrink-0 hidden sm:flex items-center justify-center touch-none"
                  title={t('categoryManager.dragHandle')}
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Aisle Index Badge */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border transition-colors',
                    cat.is_hidden
                      ? 'bg-muted text-muted-foreground border-border/50'
                      : 'bg-primary/10 text-primary border-primary/20'
                  )}
                  title={`${t('categoryManager.aisleNumber', { number: index + 1 })}`}
                >
                  {index + 1}
                </div>

                {/* Category Details / Inline Edit */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-xs bg-background border-border"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(cat.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                          onClick={() => saveEdit(cat.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {editError && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-sm font-semibold truncate',
                          cat.is_hidden && 'line-through text-muted-foreground'
                        )}
                      >
                        {getDisplayName(cat)}
                      </span>

                      {cat.is_global ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-border/80 text-muted-foreground font-normal"
                        >
                          {t('categoryManager.globalBadge')}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-transparent font-normal"
                        >
                          {t('categoryManager.customBadge')}
                        </Badge>
                      )}

                      {cat.is_hidden && (
                        <span className="text-[11px] text-amber-500/90 font-medium">
                          ({t('common.hidden') || 'Ukryta'})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions: Reorder Buttons + Visibility + Edit/Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move Up Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isFirst}
                    onClick={() => handleMove(index, index - 1)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                    aria-label={t('categoryManager.moveUp')}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>

                  {/* Move Down Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isLast}
                    onClick={() => handleMove(index, index + 1)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                    aria-label={t('categoryManager.moveDown')}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {/* Visibility Toggle */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      triggerHaptic()
                      toggleVisibility(householdId, cat.id, !cat.is_hidden)
                    }}
                    className={cn(
                      'h-8 w-8 cursor-pointer transition-colors',
                      cat.is_hidden
                        ? 'text-muted-foreground/60 hover:text-foreground'
                        : 'text-primary hover:text-primary/80'
                    )}
                    aria-label={
                      cat.is_hidden
                        ? t('categoryManager.showCategory')
                        : t('categoryManager.hideCategory')
                    }
                    title={
                      cat.is_hidden
                        ? t('categoryManager.showCategory')
                        : t('categoryManager.hideCategory')
                    }
                  >
                    {cat.is_hidden ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Custom Category Actions (Edit & Delete) */}
                  {!cat.is_global && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(cat)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={t('categoryManager.editCategory')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCategory(cat)}
                        className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        aria-label={t('categoryManager.deleteCategory')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <ConfirmDeleteDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          title={t('categoryManager.deleteConfirmTitle')}
          itemName={deletingCategory.name}
          targetName={t('categoryManager.deleteConfirmDescription')}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}

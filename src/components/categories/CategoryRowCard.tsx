import React from 'react'
import { useTranslation } from '@/i18n'
import type { ResolvedCategory } from '@/types/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryRowCardProps {
  cat: ResolvedCategory
  index: number
  isFirst: boolean
  isLast: boolean
  isEditing: boolean
  isDragOver: boolean
  editingName: string
  setEditingName: (val: string) => void
  editError: string | null
  displayName: string
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onMove: (currentIndex: number, targetIndex: number) => void
  onToggleVisibility: (cat: ResolvedCategory) => void
  onStartEdit: (cat: ResolvedCategory) => void
  onSaveEdit: (categoryId: number) => void
  onCancelEdit: () => void
  onRequestDelete: (cat: ResolvedCategory) => void
}

export const CategoryRowCard: React.FC<CategoryRowCardProps> = ({
  cat,
  index,
  isFirst,
  isLast,
  isEditing,
  isDragOver,
  editingName,
  setEditingName,
  editError,
  displayName,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
  onToggleVisibility,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRequestDelete
}) => {
  const { t } = useTranslation()

  return (
    <div
      draggable={!isEditing}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-center gap-2.5 p-2.5 rounded-xl border bg-card/80 transition-all select-none',
        cat.is_hidden
          ? 'opacity-60 bg-muted/20 border-border/50'
          : 'border-border hover:border-border/80 shadow-xs',
        isDragOver && 'border-primary bg-primary/10 scale-[1.01]'
      )}
    >
      <div
        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 group-hover:text-muted-foreground p-1 shrink-0 hidden sm:flex items-center justify-center touch-none"
        title={t('categoryManager.dragHandle')}
      >
        <GripVertical className="w-4 h-4" />
      </div>

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
                  if (e.key === 'Enter') onSaveEdit(cat.id)
                  if (e.key === 'Escape') onCancelEdit()
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                onClick={() => onSaveEdit(cat.id)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={onCancelEdit}
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
              {displayName}
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

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isFirst}
          onClick={() => onMove(index, index - 1)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
          aria-label={t('categoryManager.moveUp')}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isLast}
          onClick={() => onMove(index, index + 1)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
          aria-label={t('categoryManager.moveDown')}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onToggleVisibility(cat)}
          className={cn(
            'h-8 w-8 cursor-pointer transition-colors',
            cat.is_hidden
              ? 'text-muted-foreground/60 hover:text-foreground'
              : 'text-primary hover:text-primary/80'
          )}
          aria-label={
            cat.is_hidden ? t('categoryManager.showCategory') : t('categoryManager.hideCategory')
          }
          title={
            cat.is_hidden ? t('categoryManager.showCategory') : t('categoryManager.hideCategory')
          }
        >
          {cat.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>

        {!cat.is_global && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onStartEdit(cat)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={t('categoryManager.editCategory')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRequestDelete(cat)}
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
}


import React from 'react'
import { useTranslation } from '@/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Check, Plus, Trash2, Pencil, X, Star, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HouseholdItem {
  id: string
  name: string
}

interface HouseholdListSectionProps {
  household: HouseholdItem | null
  userHouseholds: HouseholdItem[]
  defaultHouseholdId?: string | null
  newHouseholdName: string
  setNewHouseholdName: (val: string) => void
  isCreatingHousehold: boolean
  onCreateNewHousehold: (e: React.FormEvent) => void
  editingHouseholdId: string | null
  editingHouseholdName: string
  setEditingHouseholdName: (val: string) => void
  isSavingInlineName: boolean
  dragOverIndex: number | null
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onSelectHousehold: (id: string) => void
  onStartEditing: (h: HouseholdItem) => void
  onCancelEditing: () => void
  onSaveInlineName: (id: string) => void
  onSetDefault: (id: string) => Promise<unknown> | void
  onRequestDelete: (h: HouseholdItem) => void
}

export const HouseholdListSection: React.FC<HouseholdListSectionProps> = ({
  household,
  userHouseholds,
  defaultHouseholdId,
  newHouseholdName,
  setNewHouseholdName,
  isCreatingHousehold,
  onCreateNewHousehold,
  editingHouseholdId,
  editingHouseholdName,
  setEditingHouseholdName,
  isSavingInlineName,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSelectHousehold,
  onStartEditing,
  onCancelEditing,
  onSaveInlineName,
  onSetDefault,
  onRequestDelete
}) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="p-3.5 rounded-xl bg-background border border-border flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>{t('dialogs.households.createHousehold')}</span>
        </span>

        <form onSubmit={onCreateNewHousehold} className="flex gap-2">
          <Input
            type="text"
            value={newHouseholdName}
            onChange={(e) => setNewHouseholdName(e.target.value)}
            placeholder={t('dialogs.households.householdNamePlaceholder')}
            className="bg-card border-input text-foreground text-xs focus:border-primary"
          />
          <Button
            type="submit"
            disabled={isCreatingHousehold || !newHouseholdName.trim()}
            size="sm"
            className="bg-card hover:bg-muted text-primary border border-border text-xs font-semibold shrink-0 disabled:opacity-40"
          >
            {isCreatingHousehold ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{t('dialogs.households.createButton')}</span>
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t('dialogs.households.myHouseholds')}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">{userHouseholds.length}</span>
        </div>

        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-thin">
          {userHouseholds.map((h, index) => {
            const isActive = h.id === household?.id
            const isDef = h.id === defaultHouseholdId
            const isEditing = editingHouseholdId === h.id
            const isDragOver = dragOverIndex === index

            return (
              <div
                key={h.id}
                draggable={!isEditing && !isDef}
                onDragStart={() => !isDef && onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={(e) => onDrop(e, index)}
                onDragEnd={onDragEnd}
                onClick={() => !isEditing && onSelectHousehold(h.id)}
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between transition-all select-none',
                  isActive
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'bg-background border-border hover:border-border/80 text-muted-foreground',
                  isDragOver && 'border-primary bg-primary/10 scale-[1.01]',
                  !isEditing && 'cursor-pointer active:scale-[0.99]'
                )}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onSaveInlineName(h.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 flex-1 min-w-0 mr-2"
                  >
                    <Input
                      type="text"
                      value={editingHouseholdName}
                      onChange={(e) => setEditingHouseholdName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation()
                          onCancelEditing()
                        }
                      }}
                      className="h-8 text-xs bg-background border-primary px-2.5 py-1 flex-1 min-w-0"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={isSavingInlineName || !editingHouseholdName.trim()}
                      className="h-7 w-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shrink-0"
                      title={t('common.save')}
                    >
                      {isSavingInlineName ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={onCancelEditing}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      title={t('common.cancel')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    {!isDef ? (
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground p-0.5 shrink-0 flex items-center justify-center touch-none"
                        title="Przeciągnij, aby zmienić kolejność"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                    )}
                    <Home className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartEditing(h)
                      }}
                      className="font-semibold text-sm text-foreground truncate cursor-text hover:underline decoration-dotted decoration-primary/50 underline-offset-4 flex items-center gap-1.5 group/edit"
                      title={t('dialogs.households.editNameTooltip') || 'Kliknij, aby zmienić nazwę'}
                    >
                      {h.name}
                      <Pencil className="w-3 h-3 text-muted-foreground/40 group-hover/edit:text-primary transition-colors shrink-0" />
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {isDef && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20"
                    >
                      {t('dialogs.households.defaultBadge')}
                    </Badge>
                  )}
                  {isActive ? (
                    <Badge
                      variant="default"
                      className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground font-bold"
                    >
                      {t('dialogs.households.activeBadge')}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground hover:text-foreground font-mono">
                      {t('common.select')}
                    </span>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!isDef) {
                        await onSetDefault(h.id)
                      }
                    }}
                    className={cn(
                      'h-7 w-7 rounded-lg cursor-pointer transition-colors ml-1',
                      isDef
                        ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10'
                        : 'text-muted-foreground/60 hover:text-amber-400 hover:bg-amber-400/10'
                    )}
                    title={isDef ? t('dialogs.households.defaultBadge') : t('dialogs.households.setAsDefault')}
                    aria-label={isDef ? t('dialogs.households.defaultBadge') : t('dialogs.households.setAsDefault')}
                  >
                    <Star className={cn('w-3.5 h-3.5', isDef && 'fill-amber-400')} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRequestDelete(h)
                    }}
                    className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer ml-0.5"
                    title={t('dialogs.deleteHousehold.deleteButtonTooltip')}
                    aria-label={`${t('dialogs.deleteHousehold.deleteButtonTooltip')} ${h.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

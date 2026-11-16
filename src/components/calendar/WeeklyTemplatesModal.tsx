import React, { useState } from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useShallow } from 'zustand/react/shallow'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import type { WeeklyMealTemplate } from '@/types/calendar'
import {
  LayoutTemplate,
  BookmarkPlus,
  CalendarCheck,
  Trash2,
  Users,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeeklyTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStartMondayIso: string
  weekRangeLabel: string
  currentWeekMealsCount: number
  numDays: 5 | 7
}

const MULTIPLIER_PRESETS = [0.5, 1, 1.5, 2, 3, 4]

export const WeeklyTemplatesModal: React.FC<WeeklyTemplatesModalProps> = ({
  open,
  onOpenChange,
  weekStartMondayIso,
  weekRangeLabel,
  currentWeekMealsCount,
  numDays
}) => {
  const { t } = useTranslation()
  const { isDesktop } = useDeviceLayout()
  const {
    weeklyTemplates,
    saveWeekAsTemplate,
    applyWeeklyTemplate,
    deleteWeeklyTemplate
  } = useMealPlanStore(
    useShallow((state) => ({
      weeklyTemplates: state.weeklyTemplates,
      saveWeekAsTemplate: state.saveWeekAsTemplate,
      applyWeeklyTemplate: state.applyWeeklyTemplate,
      deleteWeeklyTemplate: state.deleteWeeklyTemplate
    }))
  )

  const [templateName, setTemplateName] = useState('')
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<WeeklyMealTemplate | null>(null)

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim() || currentWeekMealsCount === 0) return
    const saved = saveWeekAsTemplate(templateName.trim(), weekStartMondayIso, numDays)
    if (saved) {
      setTemplateName('')
    }
  }

  const handleApply = async (templateId: string) => {
    setApplyingId(templateId)
    const count = await applyWeeklyTemplate(templateId, weekStartMondayIso, {
      servingsMultiplier,
      skipDuplicates: true
    })
    setApplyingId(null)
    if (count > 0) {
      onOpenChange(false)
    }
  }

  const headerContent = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
        <LayoutTemplate className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
          {t('calendar.templates.title')}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('calendar.templates.subtitle', { week: weekRangeLabel })}
        </p>
      </div>
    </div>
  )

  const bodyContent = (
    <div className="py-4 px-6 flex flex-col gap-5 flex-1 overflow-y-auto scrollbar-thin text-xs">
      {/* 1. Save Current Week as Template */}
      <form
        onSubmit={handleSaveTemplate}
        className="p-3.5 rounded-2xl bg-background border border-border flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <BookmarkPlus className="w-4 h-4 text-primary" />
            <span>{t('calendar.templates.saveCurrentWeekTitle')}</span>
          </span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {t('calendar.templates.mealsInWeekCount', { count: currentWeekMealsCount })}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t('calendar.templates.namePlaceholder')}
            className="h-10 text-xs flex-1"
          />
          <Button
            type="submit"
            disabled={!templateName.trim() || currentWeekMealsCount === 0}
            className="min-h-[44px] sm:h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 shrink-0 cursor-pointer"
          >
            {t('calendar.templates.saveButton')}
          </Button>
        </div>

        {currentWeekMealsCount === 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {t('calendar.templates.emptyWeekHint')}
          </p>
        )}
      </form>

      {/* 2. Portion Scaling Multiplier */}
      <div className="p-3.5 rounded-2xl bg-background border border-border flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <span>{t('calendar.templates.scaleServingsLabel')}</span>
          </span>
          <span className="font-mono font-bold text-primary">{servingsMultiplier}x</span>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {MULTIPLIER_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setServingsMultiplier(preset)}
              className={cn(
                'py-2 min-h-[44px] sm:min-h-[36px] rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer',
                servingsMultiplier === preset
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
              )}
            >
              {preset}x
            </button>
          ))}
        </div>
      </div>

      {/* 3. Saved Templates List */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
            {t('calendar.templates.savedListTitle')} ({weeklyTemplates.length})
          </h4>
        </div>

        {weeklyTemplates.length === 0 ? (
          <div className="p-6 rounded-2xl bg-background/60 border border-dashed border-border text-center flex flex-col items-center gap-2 text-muted-foreground">
            <Sparkles className="w-6 h-6 text-muted-foreground/50" />
            <p className="font-medium">{t('calendar.templates.noSavedTemplates')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {weeklyTemplates.map((tpl) => {
              const uniqueDays = new Set(tpl.entries.map((e) => e.day_offset)).size
              const previewNames = Array.from(
                new Set(
                  tpl.entries
                    .map((e) => e.meal_name || e.custom_name)
                    .filter((n): n is string => Boolean(n))
                )
              ).slice(0, 4)

              return (
                <div
                  key={tpl.id}
                  className="p-3.5 rounded-2xl bg-background border border-border flex flex-col gap-2.5 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-sm text-foreground truncate">{tpl.name}</h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t('calendar.templates.templateMeta', {
                          meals: tpl.entries.length,
                          days: uniqueDays
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApply(tpl.id)}
                        disabled={applyingId === tpl.id}
                        className="min-h-[44px] sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 px-3 text-xs cursor-pointer"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>{t('calendar.templates.applyButton')}</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => setTemplateToDelete(tpl)}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {previewNames.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {previewNames.map((mealName) => (
                        <Badge
                          key={mealName}
                          variant="secondary"
                          className="text-[10px] font-medium py-0 px-2"
                        >
                          {mealName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const confirmDialog = (
    <ConfirmDeleteDialog
      open={!!templateToDelete}
      onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}
      itemName={templateToDelete?.name}
      onConfirm={() => {
        if (templateToDelete) {
          deleteWeeklyTemplate(templateToDelete.id)
          setTemplateToDelete(null)
        }
      }}
    />
  )

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-lg w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
              <DialogTitle className="sr-only">{t('calendar.templates.title')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('calendar.templates.subtitle', { week: weekRangeLabel })}
              </DialogDescription>
              {headerContent}
            </DialogHeader>
            {bodyContent}
          </DialogContent>
        </Dialog>
        {confirmDialog}
      </>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] bg-card border-t border-border text-foreground rounded-t-3xl flex flex-col p-0 overflow-hidden"
        >
          <SheetHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0 text-left">
            <SheetTitle className="sr-only">{t('calendar.templates.title')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('calendar.templates.subtitle', { week: weekRangeLabel })}
            </SheetDescription>
            {headerContent}
          </SheetHeader>
          {bodyContent}
        </SheetContent>
      </Sheet>
      {confirmDialog}
    </>
  )
}

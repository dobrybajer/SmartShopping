import React from 'react'
import { useTranslation } from '@/i18n'
import { useJsonRecipeImport } from '@/hooks/useJsonRecipeImport'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileCode2,
  Copy,
  Check,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Save,
  Loader2,
  Wand2,
  Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JsonRecipeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const JsonRecipeImportDialog: React.FC<JsonRecipeImportDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { t } = useTranslation()
  const ctrl = useJsonRecipeImport({ open, onOpenChange, onSuccess })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-4xl w-full bg-card border-border text-foreground p-0 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden select-text"
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0 text-left">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                    {t('dialogs.jsonRecipeImport.title')}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] bg-background border-border text-muted-foreground hidden sm:inline-flex items-center gap-1"
                  >
                    <Terminal className="w-3 h-3 text-primary" />
                    <span>CTRL + ALT + P</span>
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('dialogs.jsonRecipeImport.subtitle')}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={ctrl.handleCopyTemplate}
                className="h-8 text-xs font-semibold border-border bg-background hover:bg-muted text-foreground cursor-pointer gap-1.5"
                title={t('dialogs.jsonRecipeImport.copyTemplate')}
              >
                {ctrl.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span className="text-emerald-400 font-bold">
                      {t('dialogs.jsonRecipeImport.copiedTemplate')}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('dialogs.jsonRecipeImport.copyTemplate')}</span>
                  </>
                )}
              </Button>

              {ctrl.validation.isSyntaxValid && !ctrl.isEmpty && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={ctrl.handleFormatJson}
                  className="h-8 text-xs border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  title="Format JSON"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Prettify</span>
                </Button>
              )}

              {!ctrl.isEmpty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={ctrl.handleClear}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  title={t('dialogs.jsonRecipeImport.clear')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col p-6 gap-4 overflow-y-auto scrollbar-thin">
          <div className="relative rounded-xl border border-border bg-background flex flex-col overflow-hidden shadow-inner focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 border-b border-border text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />
                <span>recipe.json</span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  {ctrl.lineCount} {ctrl.lineCount === 1 ? 'line' : 'lines'}
                </span>
                <span>{ctrl.jsonText.length} chars</span>
              </div>
            </div>

            <textarea
              value={ctrl.jsonText}
              onChange={(e) => {
                ctrl.setJsonText(e.target.value)
                ctrl.setSubmitError(null)
              }}
              placeholder={t('dialogs.jsonRecipeImport.placeholder')}
              className="w-full h-64 sm:h-80 p-3.5 bg-transparent font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none leading-relaxed selection:bg-primary/30"
              spellCheck={false}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            {ctrl.isEmpty && (
              <div className="p-3.5 rounded-xl bg-card border border-border flex items-start justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="w-4 h-4 text-primary shrink-0" />
                  <p>{t('dialogs.jsonRecipeImport.emptyHint')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={ctrl.handleInsertTemplate}
                  className="h-7 text-xs border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-semibold shrink-0 cursor-pointer gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Wstaw przykład</span>
                </Button>
              </div>
            )}

            {!ctrl.isEmpty && !ctrl.validation.isSyntaxValid && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3 text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-bold">{t('dialogs.jsonRecipeImport.syntaxErrorTitle')}</span>
                  <p className="font-mono text-[11px] opacity-90 break-words">
                    {ctrl.validation.syntaxError}
                  </p>
                </div>
              </div>
            )}

            {!ctrl.isEmpty &&
              ctrl.validation.isSyntaxValid &&
              ctrl.validation.validationErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="font-bold text-amber-300">
                      {t('dialogs.jsonRecipeImport.schemaErrorsTitle').replace(
                        '{count}',
                        String(ctrl.validation.validationErrors.length)
                      )}
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 font-mono">
                      {ctrl.validation.validationErrors.map((err, i) => (
                        <li key={i} className="leading-snug">
                          {err.recipeIndex ? `[Przepis #${err.recipeIndex}] ` : ''}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            {ctrl.validation.isValid && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-300">
                      {t('dialogs.jsonRecipeImport.validStatus')
                        .replace('{recipeCount}', String(ctrl.validation.recipes.length))
                        .replace('{ingredientCount}', String(ctrl.validation.totalIngredientsCount))}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">
                      {ctrl.validation.recipes.map((r) => r.name).join(', ')}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold shrink-0"
                >
                  Gotowy do zapisu
                </Badge>
              </div>
            )}

            {ctrl.submitError && (
              <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ctrl.submitError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-card/90 shrink-0 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={ctrl.handleDiscard}
            disabled={ctrl.isSubmitting}
            className="h-11 px-5 rounded-xl border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted font-bold cursor-pointer transition-all"
          >
            <X className="w-4 h-4 mr-1.5" />
            <span>{t('dialogs.jsonRecipeImport.discard')}</span>
          </Button>

          <Button
            type="button"
            onClick={ctrl.handleSave}
            disabled={!ctrl.validation.isValid || ctrl.isSubmitting || !ctrl.household}
            className={cn(
              'h-11 px-6 rounded-xl font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer',
              ctrl.validation.isValid && !ctrl.isSubmitting
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95'
                : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
            )}
          >
            {ctrl.isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('dialogs.jsonRecipeImport.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {ctrl.validation.recipes.length > 1
                    ? t('dialogs.jsonRecipeImport.saveRecipes').replace(
                        '{count}',
                        String(ctrl.validation.recipes.length)
                      )
                    : t('dialogs.jsonRecipeImport.saveRecipe')}
                </span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

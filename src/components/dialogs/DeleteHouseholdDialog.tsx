import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Trash2, Copy, Check, ShieldAlert } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

interface DeleteHouseholdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  household: { id: string; name: string } | null
  onConfirmDelete: (householdId: string) => Promise<boolean>
}

const RANDOM_LETTERS_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

const generateRandomLetters = (length = 6): string => {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += RANDOM_LETTERS_POOL.charAt(Math.floor(Math.random() * RANDOM_LETTERS_POOL.length))
  }
  return result
}

export const DeleteHouseholdDialog: React.FC<DeleteHouseholdDialogProps> = ({
  open,
  onOpenChange,
  household,
  onConfirmDelete
}) => {
  const { t } = useTranslation()
  const [randomLetters, setRandomLetters] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open && household) {
      setRandomLetters(generateRandomLetters(6))
      setInputValue('')
      setCopied(false)
      setErrorMessage(null)
      setIsDeleting(false)
    }
  }, [open, household])

  const expectedPhrase = household ? `${household.name} ${randomLetters}` : ''
  const isMatch =
    Boolean(household && expectedPhrase) &&
    (inputValue.trim() === expectedPhrase ||
      inputValue.trim() === `${household?.name}${randomLetters}`)

  const handleCopyExpected = async () => {
    if (!expectedPhrase) return
    try {
      await navigator.clipboard.writeText(expectedPhrase)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback or ignore clipboard errors
    }
  }

  const handleDelete = async () => {
    if (!household || !isMatch || isDeleting) return
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const success = await onConfirmDelete(household.id)
      if (success) {
        onOpenChange(false)
      } else {
        setErrorMessage(t('dialogs.deleteHousehold.deleteError'))
      }
    } catch {
      setErrorMessage(t('dialogs.deleteHousehold.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-md bg-card border-border text-foreground p-6 rounded-2xl shadow-2xl"
      >
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-1 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {t('dialogs.deleteHousehold.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed text-center">
            {t('dialogs.deleteHousehold.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 my-3">
          {/* Target Household Name Notice */}
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-left">
              <span className="text-muted-foreground">
                {t('dialogs.deleteHousehold.instruction')}
              </span>
            </div>
          </div>

          {/* Expected confirmation phrase badge with copy button */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground text-left">
              {t('dialogs.deleteHousehold.requiredTextLabel')}
            </label>
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-2">
              <span
                data-testid="expected-confirmation-phrase"
                className="font-mono text-sm font-bold text-destructive tracking-wide break-all select-all"
              >
                {expectedPhrase}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyExpected}
                className="h-8 px-2.5 shrink-0 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title={copied ? t('dialogs.deleteHousehold.copied') : 'Kopiuj'}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary mr-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1" />
                )}
                <span className="text-[11px]">{copied ? t('dialogs.deleteHousehold.copied') : 'Kopiuj'}</span>
              </Button>
            </div>
          </div>

          {/* Input field */}
          <div className="flex flex-col gap-1.5">
            <Input
              data-testid="delete-confirmation-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={expectedPhrase}
              disabled={isDeleting}
              className={cn(
                'h-11 text-sm bg-background border-border text-foreground font-mono focus:border-primary',
                isMatch && 'border-destructive focus:border-destructive text-destructive font-bold'
              )}
              autoFocus
            />
            {inputValue && !isMatch && (
              <span className="text-[11px] text-muted-foreground">
                {t('dialogs.deleteHousehold.instruction')}
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-2 sm:space-x-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 border-border bg-background hover:bg-muted text-foreground rounded-xl h-11 cursor-pointer font-medium text-xs"
          >
            {t('common.cancel')}
          </Button>
          <Button
            data-testid="confirm-delete-household-button"
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className={cn(
              'flex-1 rounded-xl h-11 flex items-center justify-center gap-1.5 font-bold text-xs shadow-md transition-all',
              isMatch
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer animate-in fade-in'
                : 'opacity-40 cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{t('dialogs.deleteHousehold.confirmButton')}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

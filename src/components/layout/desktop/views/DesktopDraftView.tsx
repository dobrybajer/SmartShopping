import React, { useState } from 'react'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import { shoppingListService } from '@/services/shoppingListService'
import type { DraftItem } from '@/store/useShoppingStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddAdHocSheet } from '@/components/dialogs/AddAdHocSheet'
import { ConfirmDeleteDialog } from '@/components/dialogs/ConfirmDeleteDialog'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Play,
  CheckCircle2,
  Utensils,
  Layers
} from 'lucide-react'
import { getNextQuantity } from '@/lib/utils'

interface DesktopDraftViewProps {
  onActiveListCreated?: () => void
}

export const DesktopDraftView: React.FC<DesktopDraftViewProps> = ({
  onActiveListCreated
}) => {
  const { draftItems, updateDraftQuantity, removeFromDraft, clearDraft } = useShoppingStore()
  const { household } = useAuth()
  const { t, formatUnit, formatQuantity } = useTranslation()

  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<DraftItem | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const handleIncrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'increase')
    updateDraftQuantity(item.id, newQty)
  }

  const handleDecrease = (item: DraftItem) => {
    const newQty = getNextQuantity(item.quantity, item.unit_type, 'decrease')
    if (newQty <= 0) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
    } else {
      updateDraftQuantity(item.id, newQty)
    }
  }

  const startEditing = (itemId: string, currentQuantity: number) => {
    setEditingId(itemId)
    setEditValue(String(currentQuantity))
  }

  const handleInputChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    const normalized = cleaned.replace(/^0+/, '')
    setEditValue(normalized)
  }

  const handleCommitEdit = (itemId: string) => {
    const parsed = parseInt(editValue, 10)
    setEditingId(null)
    setEditValue('')

    if (!isNaN(parsed) && parsed > 0) {
      updateDraftQuantity(itemId, parsed)
    }
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeFromDraft(itemToDelete.id)
      setItemToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleGenerateActiveList = async () => {
    if (!household || draftItems.length === 0) return
    setIsGenerating(true)

    const listName = `${t('activeList.title')} - ${new Date().toLocaleDateString()}`
    const result = await shoppingListService.createActiveListFromDraft(
      household.id,
      listName,
      draftItems
    )

    setIsGenerating(false)

    if (result) {
      clearDraft()
      if (onActiveListCreated) {
        onActiveListCreated()
      }
    }
  }

  const getCategoryLabel = (catName: string) => {
    return t(`categories.${catName}` as any) !== `categories.${catName}`
      ? t(`categories.${catName}` as any)
      : catName
  }

  const adHocCount = draftItems.filter((i) => i.is_ad_hoc).length
  const recipeItemsCount = draftItems.length - adHocCount

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {draftItems.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center bg-card/40 border border-border border-dashed rounded-3xl p-12 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground mb-5 shadow-2xl">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-extrabold text-foreground">{t('draft.emptyTitle')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            {t('draft.emptySubtitle')}
          </p>

          <Button
            onClick={() => setIsAdHocOpen(true)}
            className="mt-6 h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('draft.addAdHoc')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: 2/3 Width Item List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {t('navigation.draft')} ({draftItems.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('draft.subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsAdHocOpen(true)}
                  size="sm"
                  className="h-9 px-3 bg-card hover:bg-muted text-primary border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('draft.addAdHoc')}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearDraft()}
                  className="h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border rounded-xl text-xs font-medium cursor-pointer"
                  title={t('draft.clearCart')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>{t('draft.clearCart')}</span>
                </Button>
              </div>
            </div>

            {/* List of Items */}
            <div className="flex flex-col gap-2.5">
              {draftItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-card border border-border hover:border-border/80 transition-all flex items-center justify-between gap-4 shadow-sm group"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors shrink-0">
                      {item.is_ad_hoc ? <ShoppingBag className="w-4 h-4 text-amber-400" /> : <Utensils className="w-4 h-4 text-primary" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {item.name}
                        </span>
                        {item.is_ad_hoc ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            {t('draft.adHocItem')}
                          </Badge>
                        ) : item.meal_source ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 text-muted-foreground bg-background border-border">
                            {item.meal_source}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {getCategoryLabel(item.category_name)}
                      </span>
                    </div>
                  </div>

                  {/* Stepper +/- & Numeric Editor */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleDecrease(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                        title={t('common.decrease')}
                        aria-label={t('common.decrease')}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {editingId === item.id ? (
                        <div className="flex items-center gap-1 px-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                            value={editValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCommitEdit(item.id)
                              } else if (e.key === 'Escape') {
                                setEditingId(null)
                                setEditValue('')
                              }
                            }}
                            onBlur={() => handleCommitEdit(item.id)}
                            className="w-16 h-8 bg-background text-center font-mono text-xs font-bold text-primary border border-primary/60 rounded px-1 outline-none ring-1 ring-primary/40 shadow-inner"
                          />
                          <span className="font-mono text-xs text-primary font-bold pr-1 select-none">
                            {formatUnit(item.unit_type)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(item.id, item.quantity)}
                          className="font-mono text-xs px-3 py-1 font-bold min-w-[4.5rem] text-center text-primary hover:bg-muted rounded-lg transition-colors cursor-text select-none"
                          title={t('common.edit')}
                        >
                          {formatQuantity(item.quantity, item.unit_type)}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleIncrease(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                        title={t('common.increase')}
                        aria-label={t('common.increase')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setItemToDelete(item)
                        setIsDeleteModalOpen(true)
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 1/3 Summary & Launch Deck */}
          <div className="flex flex-col gap-5 sticky top-24">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span>{t('draft.generateActiveList')}</span>
                </h3>
                <Badge variant="default" className="bg-primary/10 text-primary border border-primary/20">
                  {t('draft.readyBadge')}
                </Badge>
              </div>

              {/* Statistics Breakdown */}
              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('common.all')}:</span>
                  <strong className="text-foreground text-sm">{draftItems.length}</strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('navigation.cookbook')}:</span>
                  <strong className="text-primary">{recipeItemsCount}</strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('draft.adHocItem')}:</span>
                  <strong className="text-amber-400">{adHocCount}</strong>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('dialogs.households.currentHousehold')}:</span>
                  <span className="text-foreground font-sans font-semibold truncate max-w-[150px]">
                    {household?.name}
                  </span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3.5 rounded-2xl bg-background/60 border border-border text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {t('draft.subtitle')}
                </span>
              </div>

              {/* Big Launch Button */}
              <Button
                onClick={handleGenerateActiveList}
                disabled={isGenerating}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <div className="w-6 h-6 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{t('draft.generateActiveList')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ad-hoc Sheet */}
      <AddAdHocSheet open={isAdHocOpen} onOpenChange={setIsAdHocOpen} />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={itemToDelete?.name}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { useShoppingStore, type DraftItem } from '@/store/useShoppingStore'
import { useShallow } from 'zustand/react/shallow'
import { shoppingListService, type ShoppingListSummary } from '@/services/shoppingListService'
import { formatDate } from '@/lib/utils'
import {
  sortActiveLists,
  findTargetTransferListId
} from '@/lib/calculations/activeListCalculations'

interface UseTransferToActiveListParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: DraftItem[]
  onSuccess: (targetListId: string) => void
}

export function useTransferToActiveList({
  open,
  onOpenChange,
  selectedItems,
  onSuccess
}: UseTransferToActiveListParams) {
  const { household } = useAuth()
  const { t } = useTranslation()
  const { selectedActiveListId, setSelectedActiveListId, syncListItemsToPipeline } = useShoppingStore(
    useShallow((state) => ({
      selectedActiveListId: state.selectedActiveListId,
      setSelectedActiveListId: state.setSelectedActiveListId,
      syncListItemsToPipeline: state.syncListItemsToPipeline
    }))
  )

  const [activeLists, setActiveLists] = useState<ShoppingListSummary[]>([])
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [targetListId, setTargetListId] = useState<string>('')
  const [newListName, setNewListName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const householdId = household?.id

  useEffect(() => {
    if (!open || !householdId) return

    let isMounted = true
    shoppingListService.getActiveListsSummary(householdId).then((lists) => {
      if (!isMounted) return
      const sorted = sortActiveLists(lists)
      setActiveLists(sorted)

      if (sorted.length === 0) {
        setMode('new')
        setNewListName(`${t('activeList.title')} ${formatDate(new Date())}`)
      } else {
        const targetId = findTargetTransferListId(sorted, selectedActiveListId)
        if (targetId) {
          setTargetListId(targetId)
        }
        setMode('existing')
        setNewListName(`${t('activeList.title')} ${formatDate(new Date())}`)
      }
    })

    return () => {
      isMounted = false
    }
  }, [open, householdId, selectedActiveListId, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || selectedItems.length === 0 || isSubmitting) return

    setIsSubmitting(true)

    try {
      if (mode === 'new') {
        const created = await shoppingListService.createActiveListFromDraft(
          household.id,
          newListName.trim() || `${t('activeList.title')} ${formatDate(new Date())}`,
          selectedItems,
          isDefault
        )

        if (created) {
          syncListItemsToPipeline(created.id, created.items)
          setSelectedActiveListId(created.id)
          onSuccess(created.id)
          onOpenChange(false)
        }
      } else {
        if (!targetListId) return
        const updated = await shoppingListService.addItemsToActiveList(
          targetListId,
          household.id,
          selectedItems
        )

        if (updated) {
          syncListItemsToPipeline(updated.id, updated.items)
          setSelectedActiveListId(updated.id)
          onSuccess(updated.id)
          onOpenChange(false)
        }
      }
    } catch (err) {
      console.error('Error transferring draft items:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedListObj = activeLists.find((l) => l.id === targetListId)

  return {
    activeLists,
    mode,
    setMode,
    targetListId,
    setTargetListId,
    newListName,
    setNewListName,
    isDefault,
    setIsDefault,
    isSubmitting,
    selectedListObj,
    handleSubmit
  }
}


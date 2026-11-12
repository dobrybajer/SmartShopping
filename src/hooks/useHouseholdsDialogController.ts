import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/i18n'
import type { MemberDetail, InviteDetail } from '@/services/householdService'
import { reorderHouseholdsList } from '@/lib/calculations/householdSorting'

interface UseHouseholdsDialogControllerParams {
  open: boolean
}

export function useHouseholdsDialogController({ open }: UseHouseholdsDialogControllerParams) {
  const {
    household,
    userHouseholds,
    userProfile,
    switchHousehold,
    updateHouseholdName,
    setDefaultHousehold,
    reorderHouseholds,
    createHousehold,
    deleteHousehold,
    addUserToHousehold,
    getHouseholdMembers
  } = useAuth()
  const { t } = useTranslation()

  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null)
  const [editingHouseholdName, setEditingHouseholdName] = useState('')
  const [isSavingInlineName, setIsSavingInlineName] = useState(false)

  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false)

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [householdToDelete, setHouseholdToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [members, setMembers] = useState<MemberDetail[]>([])
  const [invites, setInvites] = useState<InviteDetail[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const draggedIndexRef = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      setDragOverIndex(index === 0 ? 1 : index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const startIndex = draggedIndexRef.current
    setDragOverIndex(null)
    draggedIndexRef.current = null

    if (startIndex === null || startIndex === dropIndex) return
    const reordered = reorderHouseholdsList(
      userHouseholds,
      startIndex,
      dropIndex,
      userProfile?.household_id
    )
    reorderHouseholds(reordered.map((h) => h.id))
  }

  const handleDragEnd = () => {
    draggedIndexRef.current = null
    setDragOverIndex(null)
  }

  const householdId = household?.id
  const loadHouseholdDetails = useCallback(async () => {
    if (!householdId) return
    if (members.length === 0) {
      setLoadingMembers(true)
    }
    const data = await getHouseholdMembers(householdId)
    setMembers(data.members || [])
    setInvites(data.invites || [])
    setLoadingMembers(false)
  }, [householdId, getHouseholdMembers, members.length])

  useEffect(() => {
    if (open && householdId) {
      loadHouseholdDetails()
    }
  }, [open, householdId, loadHouseholdDetails])

  const startEditingHousehold = (h: { id: string; name: string }) => {
    setEditingHouseholdId(h.id)
    setEditingHouseholdName(h.name)
  }

  const cancelEditingHousehold = () => {
    setEditingHouseholdId(null)
    setEditingHouseholdName('')
  }

  const handleSaveInlineName = async (hId: string) => {
    if (!editingHouseholdName.trim() || isSavingInlineName) return
    setIsSavingInlineName(true)
    const success = await updateHouseholdName(hId, editingHouseholdName.trim())
    setIsSavingInlineName(false)
    if (success) {
      setEditingHouseholdId(null)
      setEditingHouseholdName('')
    }
  }

  const handleCreateNewHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHouseholdName.trim() || isCreatingHousehold) return
    setIsCreatingHousehold(true)

    const newH = await createHousehold(newHouseholdName.trim())
    setIsCreatingHousehold(false)

    if (newH) {
      setNewHouseholdName('')
      switchHousehold(newH.id)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !household || isInviting) return
    setIsInviting(true)
    setInviteFeedback(null)

    const result = await addUserToHousehold(household.id, inviteEmail.trim())
    setIsInviting(false)

    if (result.success) {
      setInviteEmail('')
      setInviteFeedback({
        type: 'success',
        text: result.message || t('dialogs.households.inviteSentSuccess')
      })
      loadHouseholdDetails()
      setTimeout(() => setInviteFeedback(null), 4000)
    } else {
      setInviteFeedback({
        type: 'error',
        text: result.message || t('dialogs.households.inviteError')
      })
    }
  }

  const handleSelectHousehold = (hId: string) => {
    if (hId !== household?.id) {
      switchHousehold(hId)
    }
  }

  const requestDeleteHousehold = (h: { id: string; name: string }) => {
    setHouseholdToDelete(h)
    setIsDeleteDialogOpen(true)
  }

  return {
    household,
    userHouseholds,
    userProfile,
    setDefaultHousehold,
    deleteHousehold,
    editingHouseholdId,
    editingHouseholdName,
    setEditingHouseholdName,
    isSavingInlineName,
    newHouseholdName,
    setNewHouseholdName,
    isCreatingHousehold,
    isCategoryManagerOpen,
    setIsCategoryManagerOpen,
    householdToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    members,
    invites,
    loadingMembers,
    inviteEmail,
    setInviteEmail,
    isInviting,
    inviteFeedback,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    startEditingHousehold,
    cancelEditingHousehold,
    handleSaveInlineName,
    handleCreateNewHousehold,
    handleAddUser,
    handleSelectHousehold,
    requestDeleteHousehold
  }
}


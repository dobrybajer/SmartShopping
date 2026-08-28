import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n'
import type { MemberDetail, InviteDetail } from '@/services/householdService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryManagerSheet } from '@/components/dialogs/CategoryManagerSheet'
import { CategoryManagerDialog } from '@/components/dialogs/CategoryManagerDialog'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import {
  Home,
  Check,
  Plus,
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  Layers,
  Trash2,
  Pencil,
  X,
  Star,
  GripVertical
} from 'lucide-react'
import { DeleteHouseholdDialog } from '@/components/dialogs/DeleteHouseholdDialog'
import { cn } from '@/lib/utils'
import { reorderHouseholdsList } from '@/lib/calculations/householdSorting'

interface HouseholdsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const HouseholdsDialog: React.FC<HouseholdsDialogProps> = ({
  open,
  onOpenChange
}) => {
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
  const { isDesktop } = useDeviceLayout()

  // Inline rename state
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null)
  const [editingHouseholdName, setEditingHouseholdName] = useState('')
  const [isSavingInlineName, setIsSavingInlineName] = useState(false)

  // Create household state
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false)

  // Category manager & delete state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [householdToDelete, setHouseholdToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Members & invites state
  const [members, setMembers] = useState<MemberDetail[]>([])
  const [invites, setInvites] = useState<InviteDetail[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Drag and drop state for households list
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

  // Load members and invites for current household
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-lg bg-card border-border text-foreground p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t('dialogs.households.title')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('dialogs.households.myHouseholds')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* 1. Add New Household (AT THE VERY TOP) */}
          <div className="p-3.5 rounded-xl bg-background border border-border flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>{t('dialogs.households.createHousehold')}</span>
            </span>

            <form onSubmit={handleCreateNewHousehold} className="flex gap-2">
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

          {/* 2. Households List with Inline Name Editing */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('dialogs.households.myHouseholds')}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {userHouseholds.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-thin">
              {userHouseholds.map((h, index) => {
                const isActive = h.id === household?.id
                const isDef = h.id === userProfile?.household_id
                const isEditing = editingHouseholdId === h.id
                const isDragOver = dragOverIndex === index

                return (
                  <div
                    key={h.id}
                    draggable={!isEditing && !isDef}
                    onDragStart={() => !isDef && handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !isEditing && handleSelectHousehold(h.id)}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between transition-all select-none",
                      isActive
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-background border-border hover:border-border/80 text-muted-foreground",
                      isDragOver && "border-primary bg-primary/10 scale-[1.01]",
                      !isEditing && "cursor-pointer active:scale-[0.99]"
                    )}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSaveInlineName(h.id)
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
                            if (e.key === 'Escape') cancelEditingHousehold()
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
                          onClick={cancelEditingHousehold}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          title={t('common.cancel')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        {/* Drag Handle or Default Star Indicator */}
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
                        <Home
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditingHousehold(h)
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

                      {/* Set as Default Household Button (to the left of delete button) */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!isDef) {
                            await setDefaultHousehold(h.id)
                          }
                        }}
                        className={cn(
                          "h-7 w-7 rounded-lg cursor-pointer transition-colors ml-1",
                          isDef
                            ? "text-amber-400 hover:text-amber-300 bg-amber-400/10"
                            : "text-muted-foreground/60 hover:text-amber-400 hover:bg-amber-400/10"
                        )}
                        title={isDef ? t('dialogs.households.defaultBadge') : t('dialogs.households.setAsDefault')}
                        aria-label={isDef ? t('dialogs.households.defaultBadge') : t('dialogs.households.setAsDefault')}
                      >
                        <Star className={cn("w-3.5 h-3.5", isDef && "fill-amber-400")} />
                      </Button>

                      {/* Delete Household Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setHouseholdToDelete(h)
                          setIsDeleteDialogOpen(true)
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

          {/* 3. Supermarket Aisles & Categories */}
          {household && (
            <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    {t('categoryManager.manageAisles')}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t('categoryManager.subtitle')}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryManagerOpen(true)}
                className="text-xs h-8 px-3 shrink-0 cursor-pointer"
              >
                {t('common.configure')}
              </Button>
            </div>
          )}

          {/* Members & Invites Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('dialogs.households.members')}</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {t('dialogs.households.membersCount', { count: members.length })}
              </span>
            </div>

            {/* Members List */}
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-thin">
              {loadingMembers && members.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">{t('common.loading')}</div>
              ) : (
                <>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{m.email}</span>
                        </div>
                      </div>
                      {m.userId === userProfile?.id && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border">
                          {t('dialogs.households.youBadge')}
                        </Badge>
                      )}
                    </div>
                  ))}

                  {/* Invites */}
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-400/80" />
                        <span className="font-mono text-foreground text-[11px]">{inv.email}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {t('dialogs.households.pendingBadge')}
                      </Badge>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Invite user form */}
            <form onSubmit={handleAddUser} className="flex flex-col gap-2 mt-1">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <UserPlus className="w-3 h-3 text-muted-foreground" />
                <span>{t('dialogs.households.invites')}</span>
              </label>

              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('dialogs.households.inviteEmailPlaceholder')}
                  className="bg-background border-input text-foreground text-xs focus:border-primary"
                  required
                />
                <Button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 disabled:opacity-40"
                >
                  {isInviting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('dialogs.households.sendInvite')}</span>
                    </>
                  )}
                </Button>
              </div>

              {inviteFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${inviteFeedback.type === 'success'
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : 'bg-destructive/10 border border-destructive/20 text-destructive'
                    }`}
                >
                  {inviteFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  <span>{inviteFeedback.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Category Manager Modal (Desktop Dialog / Mobile Sheet) */}
        {household?.id && (
          isDesktop ? (
            <CategoryManagerDialog
              open={isCategoryManagerOpen}
              onOpenChange={setIsCategoryManagerOpen}
              householdId={household.id}
            />
          ) : (
            <CategoryManagerSheet
              open={isCategoryManagerOpen}
              onOpenChange={setIsCategoryManagerOpen}
              householdId={household.id}
            />
          )
        )}

        {/* Delete Household Safety Confirmation Modal */}
        <DeleteHouseholdDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          household={householdToDelete}
          onConfirmDelete={async (hId) => {
            const success = await deleteHousehold(hId)
            return success
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
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
  Save,
  Check,
  Plus,
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    createHousehold,
    addUserToHousehold,
    getHouseholdMembers
  } = useAuth()
  const { t } = useTranslation()
  const { isDesktop } = useDeviceLayout()

  const [householdName, setHouseholdName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false)

  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false)

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const [members, setMembers] = useState<MemberDetail[]>([])
  const [invites, setInvites] = useState<InviteDetail[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sync current household name to state
  useEffect(() => {
    if (household) {
      setHouseholdName(household.name)
    }
  }, [household])

  // Load members and invites for current household
  const loadHouseholdDetails = useCallback(async () => {
    if (!household) return
    setLoadingMembers(true)
    const data = await getHouseholdMembers(household.id)
    setMembers(data.members || [])
    setInvites(data.invites || [])
    setLoadingMembers(false)
  }, [household, getHouseholdMembers])

  useEffect(() => {
    if (open && household) {
      loadHouseholdDetails()
    }
  }, [open, household, loadHouseholdDetails])

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || !householdName.trim() || isSavingName) return
    setIsSavingName(true)
    setNameSaveSuccess(false)

    const success = await updateHouseholdName(household.id, householdName.trim())
    setIsSavingName(false)

    if (success) {
      setNameSaveSuccess(true)
      setTimeout(() => setNameSaveSuccess(false), 2000)
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

  const isCurrentDefault = userProfile?.household_id === household?.id

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

        <div className="flex flex-col gap-6 mt-2">
          {/* Active Household Section */}
          <div className="p-4 rounded-xl bg-background border border-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dialogs.households.currentHousehold')}</span>
              </span>
              {isCurrentDefault && (
                <Badge variant="default" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {t('dialogs.households.defaultBadge')}
                </Badge>
              )}
            </div>

            <form onSubmit={handleSaveName} className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder={t('dialogs.households.householdNamePlaceholder')}
                  className="bg-card border-input text-foreground text-sm focus:border-primary"
                  required
                />
                <Button
                  type="submit"
                  disabled={
                    isSavingName ||
                    !householdName.trim() ||
                    householdName.trim() === (household?.name || '')
                  }
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 disabled:opacity-40"
                >
                  {isSavingName ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : nameSaveSuccess ? (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Switch Active Household */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('dialogs.households.switchHousehold')}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {userHouseholds.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto scrollbar-thin">
              {userHouseholds.map((h) => {
                const isActive = h.id === household?.id
                const isDef = h.id === userProfile?.household_id

                return (
                  <div
                    key={h.id}
                    onClick={() => handleSelectHousehold(h.id)}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]",
                      isActive
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-background border-border hover:border-border/80 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Home
                        className={cn(
                          "w-4 h-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="font-semibold text-sm text-foreground">{h.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add New Household */}
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

          {/* Supermarket Aisles & Categories */}
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
              {loadingMembers ? (
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
      </DialogContent>
    </Dialog>
  )
}

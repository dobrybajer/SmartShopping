import React, { Suspense, lazy } from 'react'
import { useTranslation } from '@/i18n'
import { useDeviceLayout } from '@/hooks/useDeviceLayout'
import { useHouseholdsDialogController } from '@/hooks/useHouseholdsDialogController'
import { HouseholdListSection } from '@/components/households/HouseholdListSection'
import { HouseholdMembersPanel } from '@/components/households/HouseholdMembersPanel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DeleteHouseholdDialog } from '@/components/dialogs/DeleteHouseholdDialog'
import { Home, Layers } from 'lucide-react'

const CategoryManagerSheet = lazy(() =>
  import('@/components/dialogs/CategoryManagerSheet').then((m) => ({
    default: m.CategoryManagerSheet
  }))
)
const CategoryManagerDialog = lazy(() =>
  import('@/components/dialogs/CategoryManagerDialog').then((m) => ({
    default: m.CategoryManagerDialog
  }))
)

interface HouseholdsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const HouseholdsDialog: React.FC<HouseholdsDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()
  const { isDesktop } = useDeviceLayout()
  const ctrl = useHouseholdsDialogController({ open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (ctrl.editingHouseholdId) {
            e.preventDefault()
            ctrl.cancelEditingHousehold()
          }
        }}
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
          <HouseholdListSection
            household={ctrl.household}
            userHouseholds={ctrl.userHouseholds}
            defaultHouseholdId={ctrl.userProfile?.household_id}
            newHouseholdName={ctrl.newHouseholdName}
            setNewHouseholdName={ctrl.setNewHouseholdName}
            isCreatingHousehold={ctrl.isCreatingHousehold}
            onCreateNewHousehold={ctrl.handleCreateNewHousehold}
            editingHouseholdId={ctrl.editingHouseholdId}
            editingHouseholdName={ctrl.editingHouseholdName}
            setEditingHouseholdName={ctrl.setEditingHouseholdName}
            isSavingInlineName={ctrl.isSavingInlineName}
            dragOverIndex={ctrl.dragOverIndex}
            onDragStart={ctrl.handleDragStart}
            onDragOver={ctrl.handleDragOver}
            onDrop={ctrl.handleDrop}
            onDragEnd={ctrl.handleDragEnd}
            onSelectHousehold={ctrl.handleSelectHousehold}
            onStartEditing={ctrl.startEditingHousehold}
            onCancelEditing={ctrl.cancelEditingHousehold}
            onSaveInlineName={ctrl.handleSaveInlineName}
            onSetDefault={ctrl.setDefaultHousehold}
            onRequestDelete={ctrl.requestDeleteHousehold}
          />

          {ctrl.household && (
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
                onClick={() => ctrl.setIsCategoryManagerOpen(true)}
                className="text-xs h-8 px-3 shrink-0 cursor-pointer"
              >
                {t('common.configure')}
              </Button>
            </div>
          )}

          <HouseholdMembersPanel
            members={ctrl.members}
            invites={ctrl.invites}
            currentUserId={ctrl.userProfile?.id}
            loadingMembers={ctrl.loadingMembers}
            inviteEmail={ctrl.inviteEmail}
            setInviteEmail={ctrl.setInviteEmail}
            isInviting={ctrl.isInviting}
            inviteFeedback={ctrl.inviteFeedback}
            onInviteUser={ctrl.handleAddUser}
          />
        </div>

        {ctrl.household?.id && ctrl.isCategoryManagerOpen && (
          <Suspense fallback={null}>
            {isDesktop ? (
              <CategoryManagerDialog
                open={ctrl.isCategoryManagerOpen}
                onOpenChange={ctrl.setIsCategoryManagerOpen}
                householdId={ctrl.household.id}
              />
            ) : (
              <CategoryManagerSheet
                open={ctrl.isCategoryManagerOpen}
                onOpenChange={ctrl.setIsCategoryManagerOpen}
                householdId={ctrl.household.id}
              />
            )}
          </Suspense>
        )}

        <DeleteHouseholdDialog
          open={ctrl.isDeleteDialogOpen}
          onOpenChange={ctrl.setIsDeleteDialogOpen}
          household={ctrl.householdToDelete}
          onConfirmDelete={async (hId) => {
            const success = await ctrl.deleteHousehold(hId)
            return success
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

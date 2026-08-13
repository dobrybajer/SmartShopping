import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Users,
  Plus,
  UserPlus,
  Save,
  Check,
  CheckCircle2,
  Mail,
  Clock,
  Sparkles
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
    userProfile,
    userHouseholds,
    switchHousehold,
    updateHouseholdName,
    setDefaultHousehold,
    createHousehold,
    addUserToHousehold,
    getHouseholdMembers
  } = useAuth()

  // Stan edycji nazwy aktywnego gospodarstwa
  const [householdName, setHouseholdName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false)

  // Stan nowego gospodarstwa
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false)

  // Stan dodawania użytkownika
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Członkowie i zaproszenia aktywnego gospodarstwa
  const [members, setMembers] = useState<MemberDetail[]>([])
  const [invites, setInvites] = useState<InviteDetail[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const isCurrentDefault = !!(household && userProfile?.household_id === household.id)

  const loadMembersData = async (hId: string) => {
    setLoadingMembers(true)
    const data = await getHouseholdMembers(hId)
    setMembers(data.members)
    setInvites(data.invites)
    setLoadingMembers(false)
  }

  useEffect(() => {
    if (open && household) {
      setHouseholdName(household.name || '')
      setNameSaveSuccess(false)
      setInviteFeedback(null)
      loadMembersData(household.id)
    }
  }, [open, household])

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || !householdName.trim()) return

    setIsSavingName(true)
    setNameSaveSuccess(false)

    const success = await updateHouseholdName(household.id, householdName.trim())
    setIsSavingName(false)

    if (success) {
      setNameSaveSuccess(true)
      setTimeout(() => setNameSaveSuccess(false), 2500)
    }
  }

  const handleToggleDefault = async (checked: boolean) => {
    if (!household) return
    await setDefaultHousehold(checked ? household.id : null)
  }

  const handleCreateNewHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHouseholdName.trim()) return

    setIsCreatingHousehold(true)
    const created = await createHousehold(newHouseholdName.trim())
    setIsCreatingHousehold(false)

    if (created) {
      setNewHouseholdName('')
      setHouseholdName(created.name)
      loadMembersData(created.id)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!household || !inviteEmail.trim()) return

    setIsInviting(true)
    setInviteFeedback(null)

    const res = await addUserToHousehold(household.id, inviteEmail.trim())
    setIsInviting(false)

    setInviteFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message
    })

    if (res.success) {
      setInviteEmail('')
      loadMembersData(household.id)
      setTimeout(() => setInviteFeedback(null), 5000)
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
        className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-100">
                Gospodarstwa Domowe
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Zarządzaj swoimi gospodarstwami, ustawieniami i członkami
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-2">
          {/* 1. SEKCJA: AKTYWNE GOSPODARSTWO (Edycja nazwy i Default) */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aktywne Gospodarstwo</span>
              </span>
              {isCurrentDefault && (
                <Badge variant="default" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                  Domyślne
                </Badge>
              )}
            </div>

            <form onSubmit={handleSaveName} className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Nazwa gospodarstwa"
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm focus:border-emerald-500"
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
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0 disabled:opacity-40"
                >
                  {isSavingName ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : nameSaveSuccess ? (
                    <Check className="w-4 h-4 text-black" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Zapisz</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Checkbox: Ustaw jako domyślne */}
              <div
                onClick={() => handleToggleDefault(!isCurrentDefault)}
                className="flex items-center gap-2.5 pt-1 cursor-pointer select-none group"
              >
                <Checkbox
                  id="default-household-chk"
                  checked={isCurrentDefault}
                  onCheckedChange={(c) => handleToggleDefault(!!c)}
                />
                <label
                  htmlFor="default-household-chk"
                  className="text-xs text-zinc-300 group-hover:text-white cursor-pointer"
                >
                  Ustaw to gospodarstwo jako moje domyślne
                </label>
              </div>
            </form>
          </div>

          {/* 2. SEKCJA: LISTA DOSTĘPNYCH GOSPODARSTW */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Twoje Gospodarstwa ({userHouseholds.length})</span>
              <span className="text-[10px] text-zinc-500 lowercase">kliknij, aby przełączyć</span>
            </span>

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
                        ? "bg-emerald-500/10 border-emerald-500/40 text-zinc-100"
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Home
                        className={cn(
                          "w-4 h-4",
                          isActive ? "text-emerald-400" : "text-zinc-500"
                        )}
                      />
                      <span className="font-semibold text-sm">{h.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDef && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          Domyślne
                        </Badge>
                      )}
                      {isActive ? (
                        <Badge
                          variant="default"
                          className="text-[9px] px-1.5 py-0 bg-emerald-500 text-black font-bold"
                        >
                          Aktywne
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono">
                          Wybierz
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. SEKCJA: DODAJ NOWE GOSPODARSTWO */}
          <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dodaj nowe gospodarstwo</span>
            </span>

            <form onSubmit={handleCreateNewHousehold} className="flex gap-2">
              <Input
                type="text"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="np. Domek Letniskowy"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:border-emerald-500"
              />
              <Button
                type="submit"
                disabled={isCreatingHousehold || !newHouseholdName.trim()}
                size="sm"
                className="bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700 text-xs font-semibold shrink-0 disabled:opacity-40"
              >
                {isCreatingHousehold ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Utwórz</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* 4. SEKCJA: CZŁONKOWIE I DODAWANIE UŻYTKOWNIKA */}
          <div className="flex flex-col gap-3 pt-2 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Członkowie gospodarstwa</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {members.length} {members.length === 1 ? 'osoba' : 'osób'}
              </span>
            </div>

            {/* Lista członków */}
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-thin">
              {loadingMembers ? (
                <div className="py-3 text-center text-xs text-zinc-500">Pobieranie członków...</div>
              ) : (
                <>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-200">{m.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{m.email}</span>
                        </div>
                      </div>
                      {m.userId === userProfile?.id && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-zinc-400 border-zinc-700">
                          Ty
                        </Badge>
                      )}
                    </div>
                  ))}

                  {/* Zaproszenia oczekujące */}
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-400/80" />
                        <span className="font-mono text-zinc-300 text-[11px]">{inv.email}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Oczekuje
                      </Badge>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Formularz dodawania użytkownika */}
            <form onSubmit={handleAddUser} className="flex flex-col gap-2 mt-1">
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                <UserPlus className="w-3 h-3 text-zinc-400" />
                <span>Dodaj osobę do tego gospodarstwa</span>
              </label>

              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="np. partner@example.com"
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 text-xs focus:border-emerald-500"
                  required
                />
                <Button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0 disabled:opacity-40"
                >
                  {isInviting ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Dodaj</span>
                    </>
                  )}
                </Button>
              </div>

              {inviteFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
                    inviteFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  {inviteFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  <span>{inviteFeedback.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

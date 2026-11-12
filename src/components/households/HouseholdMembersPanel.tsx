import React from 'react'
import { useTranslation } from '@/i18n'
import type { MemberDetail, InviteDetail } from '@/services/householdService'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Mail, Clock, CheckCircle2 } from 'lucide-react'

interface HouseholdMembersPanelProps {
  members: MemberDetail[]
  invites: InviteDetail[]
  currentUserId?: string
  loadingMembers: boolean
  inviteEmail: string
  setInviteEmail: (val: string) => void
  isInviting: boolean
  inviteFeedback: { type: 'success' | 'error'; text: string } | null
  onInviteUser: (e: React.FormEvent) => void
}

export const HouseholdMembersPanel: React.FC<HouseholdMembersPanelProps> = ({
  members,
  invites,
  currentUserId,
  loadingMembers,
  inviteEmail,
  setInviteEmail,
  isInviting,
  inviteFeedback,
  onInviteUser
}) => {
  const { t } = useTranslation()

  return (
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
                {m.userId === currentUserId && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border">
                    {t('dialogs.households.youBadge')}
                  </Badge>
                )}
              </div>
            ))}

            {invites.map((inv) => (
              <div
                key={inv.id}
                className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400/80" />
                  <span className="font-mono text-foreground text-[11px]">{inv.email}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30 flex items-center gap-1"
                >
                  <Clock className="w-2.5 h-2.5" /> {t('dialogs.households.pendingBadge')}
                </Badge>
              </div>
            ))}
          </>
        )}
      </div>

      <form onSubmit={onInviteUser} className="flex flex-col gap-2 mt-1">
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
            className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 ${
              inviteFeedback.type === 'success'
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
  )
}


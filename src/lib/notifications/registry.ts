import type {
  NotificationType,
  NotificationDefinition
} from '@/types/notification'
import { translate } from '@/i18n'

export const NOTIFICATION_REGISTRY: {
  [K in NotificationType]: NotificationDefinition<K>
} = {
  LIST_ITEM_ADDED: {
    type: 'LIST_ITEM_ADDED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => ({
      title: translate('notifications.events.listItemAdded.title', {}, lang),
      body: translate('notifications.events.listItemAdded.body', p, lang)
    })
  },
  LIST_COMPLETED: {
    type: 'LIST_COMPLETED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => ({
      title: translate('notifications.events.listCompleted.title', {}, lang),
      body: translate('notifications.events.listCompleted.body', p, lang)
    })
  },
  HOUSEHOLD_MEMBER_JOINED: {
    type: 'HOUSEHOLD_MEMBER_JOINED',
    getTag: (p) => `household-${p.householdId}`,
    getUrl: (_p) => `/?tab=settings`,
    format: (p, lang) => ({
      title: translate('notifications.events.householdMemberJoined.title', {}, lang),
      body: translate('notifications.events.householdMemberJoined.body', p, lang)
    })
  },
  LIST_CLEARED_OR_ARCHIVED: {
    type: 'LIST_CLEARED_OR_ARCHIVED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (_p) => `/?tab=history`,
    format: (p, lang) => ({
      title: translate('notifications.events.listClearedOrArchived.title', {}, lang),
      body: translate(
        p.action === 'cleared'
          ? 'notifications.events.listClearedOrArchived.bodyCleared'
          : 'notifications.events.listClearedOrArchived.bodyArchived',
        p,
        lang
      )
    })
  },
  TEST_NOTIFICATION: {
    type: 'TEST_NOTIFICATION',
    getTag: () => 'test-notification',
    getUrl: () => '/?tab=settings',
    format: (_p, lang) => ({
      title: translate('notifications.events.testNotification.title', {}, lang),
      body: translate('notifications.events.testNotification.body', {}, lang)
    })
  }
}

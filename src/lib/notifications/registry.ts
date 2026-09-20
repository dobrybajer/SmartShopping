import type {
  NotificationType,
  NotificationDefinition
} from '@/types/notification'

export const NOTIFICATION_REGISTRY: {
  [K in NotificationType]: NotificationDefinition<K>
} = {
  LIST_ITEM_ADDED: {
    type: 'LIST_ITEM_ADDED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => {
      const isPl = lang === 'pl'
      return {
        title: isPl ? '🛒 Nowy produkt na liście' : '🛒 New item on shopping list',
        body: isPl
          ? `${p.addedByName} dodał(a): "${p.itemName}" do listy "${p.listName}"`
          : `${p.addedByName} added: "${p.itemName}" to "${p.listName}"`
      }
    }
  },
  LIST_COMPLETED: {
    type: 'LIST_COMPLETED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (p) => `/?tab=active&listId=${p.listId}`,
    format: (p, lang) => {
      const isPl = lang === 'pl'
      return {
        title: isPl ? '✅ Zakupy zakończone!' : '✅ Shopping completed!',
        body: isPl
          ? `${p.completedByName} odhaczył(a) wszystkie produkty z listy "${p.listName}"`
          : `${p.completedByName} completed all items on "${p.listName}"`
      }
    }
  },
  HOUSEHOLD_MEMBER_JOINED: {
    type: 'HOUSEHOLD_MEMBER_JOINED',
    getTag: (p) => `household-${p.householdId}`,
    getUrl: (_p) => `/?tab=settings`,
    format: (p, lang) => {
      const isPl = lang === 'pl'
      return {
        title: isPl ? '👋 Nowy domownik' : '👋 New household member',
        body: isPl
          ? `${p.memberName} dołączył(a) do gospodarstwa "${p.householdName}"`
          : `${p.memberName} joined the household "${p.householdName}"`
      }
    }
  },
  LIST_CLEARED_OR_ARCHIVED: {
    type: 'LIST_CLEARED_OR_ARCHIVED',
    getTag: (p) => `list-${p.listId}`,
    getUrl: (_p) => `/?tab=history`,
    format: (p, lang) => {
      const isPl = lang === 'pl'
      const actionText =
        p.action === 'cleared'
          ? isPl
            ? 'wyczyścił(a)'
            : 'cleared'
          : isPl
          ? 'zarchiwizował(a)'
          : 'archived'
      return {
        title: isPl ? '📦 Zaktualizowano listę' : '📦 List updated',
        body: isPl
          ? `${p.clearedByName} ${actionText} listę "${p.listName}"`
          : `${p.clearedByName} ${actionText} the list "${p.listName}"`
      }
    }
  }
}

/**
 * Type-Safe Notification Registry & Event Bus Types
 * ADR-007: Multiplatform Web Push Notifications & Extensible Event Registry
 */

export type NotificationType =
  | 'LIST_ITEM_ADDED'
  | 'LIST_COMPLETED'
  | 'HOUSEHOLD_MEMBER_JOINED'
  | 'LIST_CLEARED_OR_ARCHIVED'

export interface NotificationPayloadMap {
  LIST_ITEM_ADDED: {
    listId: string
    listName: string
    itemName: string
    addedByName: string
  }
  LIST_COMPLETED: {
    listId: string
    listName: string
    completedByName: string
  }
  HOUSEHOLD_MEMBER_JOINED: {
    householdId: string
    householdName: string
    memberName: string
  }
  LIST_CLEARED_OR_ARCHIVED: {
    listId: string
    listName: string
    clearedByName: string
    action: 'cleared' | 'archived'
  }
}

export interface FormattedNotification {
  title: string
  body: string
  tag: string
  url: string
  icon?: string
  badge?: string
}

export interface NotificationDefinition<T extends NotificationType> {
  type: T
  getTag: (payload: NotificationPayloadMap[T]) => string
  getUrl: (payload: NotificationPayloadMap[T]) => string
  format: (payload: NotificationPayloadMap[T], language: 'pl' | 'en') => { title: string; body: string }
}

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushSubscriptionMetadata {
  householdId: string
  senderUserId?: string
  createdAt?: string
}

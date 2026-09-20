import { describe, it, expect } from 'vitest'
import { NOTIFICATION_REGISTRY } from '../registry'
import type { NotificationType } from '@/types/notification'

describe('NOTIFICATION_REGISTRY - Type-Safe Notification Registry (ADR-007)', () => {
  const allTypes: NotificationType[] = [
    'LIST_ITEM_ADDED',
    'LIST_COMPLETED',
    'HOUSEHOLD_MEMBER_JOINED',
    'LIST_CLEARED_OR_ARCHIVED'
  ]

  it('Flow 01: Contains definitions for all NotificationTypes', () => {
    for (const type of allTypes) {
      expect(NOTIFICATION_REGISTRY[type]).toBeDefined()
      expect(NOTIFICATION_REGISTRY[type].type).toBe(type)
      expect(typeof NOTIFICATION_REGISTRY[type].getTag).toBe('function')
      expect(typeof NOTIFICATION_REGISTRY[type].getUrl).toBe('function')
      expect(typeof NOTIFICATION_REGISTRY[type].format).toBe('function')
    }
  })

  it('Flow 02: Formats LIST_ITEM_ADDED in both Polish and English with correct tag & URL', () => {
    const payload = {
      listId: 'list-123',
      listName: 'Biedronka',
      itemName: 'Mleko Owsiane',
      addedByName: 'Kamil'
    }
    const def = NOTIFICATION_REGISTRY.LIST_ITEM_ADDED

    expect(def.getTag(payload)).toBe('list-list-123')
    expect(def.getUrl(payload)).toBe('/?tab=active&listId=list-123')

    const pl = def.format(payload, 'pl')
    expect(pl.title).toContain('Nowy produkt')
    expect(pl.body).toBe('Kamil dodał(a): "Mleko Owsiane" do listy "Biedronka"')

    const en = def.format(payload, 'en')
    expect(en.title).toContain('New item')
    expect(en.body).toBe('Kamil added: "Mleko Owsiane" to "Biedronka"')
  })

  it('Flow 03: Formats LIST_COMPLETED in both Polish and English', () => {
    const payload = {
      listId: 'list-456',
      listName: 'Lidl Sobota',
      completedByName: 'Anna'
    }
    const def = NOTIFICATION_REGISTRY.LIST_COMPLETED

    expect(def.getTag(payload)).toBe('list-list-456')
    expect(def.getUrl(payload)).toBe('/?tab=active&listId=list-456')

    const pl = def.format(payload, 'pl')
    expect(pl.title).toContain('Zakupy zakończone')
    expect(pl.body).toContain('Anna')
    expect(pl.body).toContain('Lidl Sobota')

    const en = def.format(payload, 'en')
    expect(en.title).toContain('Shopping completed')
    expect(en.body).toContain('Anna')
    expect(en.body).toContain('Lidl Sobota')
  })

  it('Flow 04: Formats HOUSEHOLD_MEMBER_JOINED in both Polish and English', () => {
    const payload = {
      householdId: 'hh-789',
      householdName: 'Nasz Dom',
      memberName: 'Tomek'
    }
    const def = NOTIFICATION_REGISTRY.HOUSEHOLD_MEMBER_JOINED

    expect(def.getTag(payload)).toBe('household-hh-789')
    expect(def.getUrl(payload)).toBe('/?tab=settings')

    const pl = def.format(payload, 'pl')
    expect(pl.title).toContain('Nowy domownik')
    expect(pl.body).toContain('Tomek')
    expect(pl.body).toContain('Nasz Dom')

    const en = def.format(payload, 'en')
    expect(en.title).toContain('New household member')
    expect(en.body).toContain('Tomek')
    expect(en.body).toContain('Nasz Dom')
  })

  it('Flow 05: Formats LIST_CLEARED_OR_ARCHIVED for both cleared and archived actions', () => {
    const def = NOTIFICATION_REGISTRY.LIST_CLEARED_OR_ARCHIVED

    const payloadArchived = {
      listId: 'list-999',
      listName: 'Poniedziałek',
      clearedByName: 'Kamil',
      action: 'archived' as const
    }
    const plArchived = def.format(payloadArchived, 'pl')
    expect(plArchived.body).toContain('zarchiwizował(a)')

    const enArchived = def.format(payloadArchived, 'en')
    expect(enArchived.body).toContain('archived')

    const payloadCleared = {
      listId: 'list-999',
      listName: 'Poniedziałek',
      clearedByName: 'Kamil',
      action: 'cleared' as const
    }
    const plCleared = def.format(payloadCleared, 'pl')
    expect(plCleared.body).toContain('wyczyścił(a)')

    const enCleared = def.format(payloadCleared, 'en')
    expect(enCleared.body).toContain('cleared')
  })
})

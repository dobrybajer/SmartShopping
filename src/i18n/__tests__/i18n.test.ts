import { describe, it, expect, beforeEach } from 'vitest'
import { en } from '../locales/en'
import { pl } from '../locales/pl'
import { useTranslation, useI18nStore } from '../index'
import { renderHook, act } from '@testing-library/react'

describe('i18n Translation Engine & Dictionary Parity', () => {
  beforeEach(() => {
    localStorage.clear()
    useI18nStore.setState({ language: 'pl' })
  })

  it('should have 100% key parity between English and Polish dictionaries', () => {
    const isPluralObject = (obj: any) =>
      obj && typeof obj === 'object' && 'one' in obj && 'other' in obj

    const compareObjects = (objA: Record<string, any>, objB: Record<string, any>, path = '') => {
      const keysA = Object.keys(objA)
      const keysB = Object.keys(objB)

      for (const key of keysA) {
        const fullPath = path ? `${path}.${key}` : key
        expect(objB, `Missing key in Polish dictionary: ${fullPath}`).toHaveProperty(key)

        if (typeof objA[key] === 'object' && objA[key] !== null) {
          expect(typeof objB[key], `Type mismatch at: ${fullPath}`).toBe('object')
          if (!isPluralObject(objA[key])) {
            compareObjects(objA[key], objB[key], fullPath)
          }
        }
      }

      for (const key of keysB) {
        const fullPath = path ? `${path}.${key}` : key
        expect(objA, `Extra key in Polish dictionary not in English: ${fullPath}`).toHaveProperty(key)
      }
    }

    compareObjects(en, pl)
  })

  it('should translate simple keys correctly in active language', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.t('common.save')).toBe('Zapisz')
    expect(result.current.t('navigation.cookbook')).toBe('Przepisy')

    act(() => {
      result.current.setLanguage('en')
    })

    expect(result.current.t('common.save')).toBe('Save')
    expect(result.current.t('navigation.cookbook')).toBe('Cookbook')
  })

  it('should interpolate parameters accurately', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.t('cookbook.addedToDraft', { name: 'Jajecznica' })).toBe(
      'Dodano "Jajecznica" do koszyka roboczego'
    )

    act(() => {
      result.current.setLanguage('en')
    })

    expect(result.current.t('cookbook.addedToDraft', { name: 'Scrambled Eggs' })).toBe(
      'Added "Scrambled Eggs" to Draft list'
    )
  })

  it('should accurately handle Polish Slavic pluralization rules (1, 2-4, 5+)', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.t('activeList.itemsLeft', { count: 1 })).toBe('Został 1 produkt')
    expect(result.current.t('activeList.itemsLeft', { count: 2 })).toBe('Zostały 2 produkty')
    expect(result.current.t('activeList.itemsLeft', { count: 4 })).toBe('Zostały 4 produkty')
    expect(result.current.t('activeList.itemsLeft', { count: 5 })).toBe('Zostało 5 produktów')
    expect(result.current.t('activeList.itemsLeft', { count: 12 })).toBe('Zostało 12 produktów')
    expect(result.current.t('activeList.itemsLeft', { count: 24 })).toBe('Zostały 24 produkty')
  })

  it('should accurately handle English pluralization rules (1, other)', () => {
    const { result } = renderHook(() => useTranslation())

    act(() => {
      result.current.setLanguage('en')
    })

    expect(result.current.t('activeList.itemsLeft', { count: 1 })).toBe('1 item left')
    expect(result.current.t('activeList.itemsLeft', { count: 2 })).toBe('2 items left')
    expect(result.current.t('activeList.itemsLeft', { count: 5 })).toBe('5 items left')
  })

  it('should correctly format units and quantities in Polish and English', () => {
    const { result } = renderHook(() => useTranslation())

    // Polish units & quantities
    expect(result.current.formatUnit('g')).toBe('g')
    expect(result.current.formatUnit('ml')).toBe('ml')
    expect(result.current.formatUnit('pcs')).toBe('szt.')
    expect(result.current.formatUnit('pcs', 1)).toBe('szt.')
    expect(result.current.formatUnit('pcs', 3)).toBe('szt.')
    expect(result.current.formatQuantity(1, 'pcs')).toBe('1 szt.')
    expect(result.current.formatQuantity(3, 'pcs')).toBe('3 szt.')
    expect(result.current.formatQuantity(250, 'g')).toBe('250 g')
    expect(result.current.formatQuantity(500, 'ml')).toBe('500 ml')

    // Switch to English
    act(() => {
      result.current.setLanguage('en')
    })

    expect(result.current.formatUnit('g')).toBe('g')
    expect(result.current.formatUnit('ml')).toBe('ml')
    expect(result.current.formatUnit('pcs')).toBe('pcs')
    expect(result.current.formatUnit('pcs', 1)).toBe('pc')
    expect(result.current.formatUnit('pcs', 3)).toBe('pcs')
    expect(result.current.formatQuantity(1, 'pcs')).toBe('1 pc')
    expect(result.current.formatQuantity(3, 'pcs')).toBe('3 pcs')
    expect(result.current.formatQuantity(250, 'g')).toBe('250 g')
    expect(result.current.formatQuantity(500, 'ml')).toBe('500 ml')
  })

  it('should ensure all static translation keys used across codebase exist in dictionary', () => {
    const sourceFiles = import.meta.glob('../../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true
    }) as Record<string, string>

    const foundKeys = new Set<string>()

    for (const [filePath, content] of Object.entries(sourceFiles)) {
      if (filePath.includes('__tests__') || filePath.includes('locales/')) continue

      const matches = content.matchAll(/\bt\(['"]([a-zA-Z0-9_.]+)['"]/g)
      for (const match of matches) {
        foundKeys.add(match[1])
      }
    }

    const getNestedValue = (obj: any, keyPath: string): any => {
      const parts = keyPath.split('.')
      let current = obj
      for (const part of parts) {
        if (current === undefined || current === null) return undefined
        current = current[part]
      }
      return current
    }

    const missingKeys: string[] = []
    for (const key of foundKeys) {
      const valEn = getNestedValue(en, key)
      const valPl = getNestedValue(pl, key)
      if (valEn === undefined || valPl === undefined) {
        missingKeys.push(key)
      }
    }

    expect(missingKeys, `Missing keys in dictionary: ${missingKeys.join(', ')}`).toEqual([])
  })
})

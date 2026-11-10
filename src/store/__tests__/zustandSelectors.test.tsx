import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { useShallow } from 'zustand/react/shallow'
import { useShoppingStore } from '../useShoppingStore'
import { usePantryStore } from '../usePantryStore'

const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

describe('HIGH-05: Zustand Selectors & useShallow Render Isolation', () => {
  beforeEach(() => {
    useShoppingStore.setState({
      activeHouseholdId: 'hh-1',
      selectedActiveListId: 'list-1',
      draftItems: [],
      activeListsSummary: []
    })
    usePantryStore.setState({
      activeHouseholdId: 'hh-1',
      pantryItems: [],
      pantryMapByProductId: {}
    })
  })

  it('does not re-render a component subscribed via atomic/useShallow selector when unrelated store fields change', () => {
    let draftRenderCount = 0
    let summaryRenderCount = 0

    const DraftSubscriber: React.FC = () => {
      draftRenderCount++
      const { draftItems, clearDraft } = useShoppingStore(
        useShallow((state) => ({
          draftItems: state.draftItems,
          clearDraft: state.clearDraft
        }))
      )
      return (
        <button type="button" onClick={clearDraft}>
          {draftItems.length}
        </button>
      )
    }

    const SummarySubscriber: React.FC = () => {
      summaryRenderCount++
      const selectedActiveListId = useShoppingStore((state) => state.selectedActiveListId)
      return <span>{selectedActiveListId}</span>
    }

    render(
      <>
        <DraftSubscriber />
        <SummarySubscriber />
      </>
    )

    expect(draftRenderCount).toBe(1)
    expect(summaryRenderCount).toBe(1)

    // Mutate selectedActiveListId & activeListsSummary (should NOT re-render DraftSubscriber!)
    act(() => {
      useShoppingStore.getState().setSelectedActiveListId('list-2')
      useShoppingStore.getState().setActiveListsSummary([
        {
          id: 'list-2',
          household_id: 'hh-1',
          name: 'Weekend',
          status: 'active',
          is_default: false,
          target_date: null,
          created_at: null,
          updated_at: null,
          total_items: 3,
          unchecked_items: 2
        }
      ])
    })

    expect(draftRenderCount).toBe(1)
    expect(summaryRenderCount).toBe(2)

    // Mutate draftItems (should NOT re-render SummarySubscriber!)
    act(() => {
      useShoppingStore.getState().addAdHocToDraft({
        name: 'Chleb',
        quantity: 1,
        unit_type: 'pcs',
        category_name: 'bakery'
      })
    })

    expect(draftRenderCount).toBe(2)
    expect(summaryRenderCount).toBe(2)
  })

  it('verifies no component in src/ invokes Zustand stores without a selector', () => {
    const bareCallRe = /use(Shopping|Pantry|Category|MealPlan|Notification|I18n|Toast)Store\(\)/
    const violations: string[] = []

    for (const [filePath, content] of Object.entries(sourceFiles)) {
      if (filePath.includes('/__tests__/') || filePath.includes('.test.')) continue
      if (bareCallRe.test(content)) {
        violations.push(filePath)
      }
    }

    expect(violations).toEqual([])
  })
})

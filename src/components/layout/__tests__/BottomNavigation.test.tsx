import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomNavigation } from '../BottomNavigation'

describe('BottomNavigation Accessibility & Ergonomics (NORM-03 & HIGH-10)', () => {
  it('sets semantic navigation landmark, aria-current="page" on active tab, and >=44px touch targets', () => {
    const onTabChange = vi.fn()
    render(<BottomNavigation activeTab="pantry" onTabChange={onTabChange} draftCount={3} activeCount={5} />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label')
    expect(nav.className).toContain('env(safe-area-inset-bottom)')

    const pantryBtn = screen.getByRole('button', { name: /Spiżarnia|Pantry/i })
    expect(pantryBtn).toHaveAttribute('aria-current', 'page')
    expect(pantryBtn.className).toContain('min-h-[44px]')
    expect(pantryBtn.className).not.toContain('max-w-[56px]')

    const draftBtn = screen.getByRole('button', { name: /Koszyk \(3\)|Draft \(3\)/i })
    expect(draftBtn).not.toHaveAttribute('aria-current')

    const activeListBtn = screen.getByRole('button', { name: /Aktywna Lista \(5\)|Active List \(5\)/i })
    expect(activeListBtn).toBeInTheDocument()
    expect(activeListBtn.textContent).toMatch(/5/)

    fireEvent.click(draftBtn)
    expect(onTabChange).toHaveBeenCalledWith('draft')
  })
})

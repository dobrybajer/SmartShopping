import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomNavigation } from '../BottomNavigation'

  describe('BottomNavigation Accessibility (NORM-03)', () => {
    it('sets semantic navigation landmark, aria-current="page" on active tab, and >=44px touch targets', () => {
      const onTabChange = vi.fn()
      render(<BottomNavigation activeTab="pantry" onTabChange={onTabChange} draftCount={3} />)

        const nav = screen.getByRole('navigation')
        expect(nav).toHaveAttribute('aria-label')

      const pantryBtn = screen.getByRole('button', { name: /Spiżarnia|Pantry/i })
      expect(pantryBtn).toHaveAttribute('aria-current', 'page')
      expect(pantryBtn.className).toContain('min-h-[44px]')

        const draftBtn = screen.getByRole('button', { name: /Koszyk \(3\)|Draft \(3\)/i })
        expect(draftBtn).not.toHaveAttribute('aria-current')

    fireEvent.click(draftBtn)
    expect(onTabChange).toHaveBeenCalledWith('draft')
  })
})

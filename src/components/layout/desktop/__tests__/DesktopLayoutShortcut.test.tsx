import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DesktopLayout } from '../DesktopLayout'
import { useAuth } from '@/context/AuthContext'
import { productService } from '@/services/productService'
import { mealService } from '@/services/mealService'

vi.mock('@/context/AuthContext')
vi.mock('@/services/productService')
vi.mock('@/services/mealService')

describe('DesktopLayout - Ctrl+Alt+P Shortcut & JSON Import Integration', () => {
  const mockHousehold = { id: 'hh-shortcut-1', name: 'Dom Rodzinny' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHousehold,
      userHouseholds: [mockHousehold]
    } as any)
    vi.mocked(productService.getProducts).mockResolvedValue([])
    vi.mocked(productService.getCategories).mockResolvedValue([])
    vi.mocked(mealService.createMeal).mockResolvedValue({ id: 'm-1' } as any)
  })

  it('Flow 01: Opens JsonRecipeImportDialog upon pressing Ctrl + Alt + P globally', async () => {
    const handleTabChange = vi.fn()

    render(
      <DesktopLayout
        activeTab="cookbook"
        onTabChange={handleTabChange}
        headerTitle="Przepiśnik"
      >
        <div>Zawartość Przepiśnika</div>
      </DesktopLayout>
    )

    // Dialog should not be initially visible
    expect(screen.queryByText(/CTRL \+ ALT \+ P/i)).not.toBeInTheDocument()

    // Trigger keyboard shortcut Ctrl + Alt + P
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'p',
          code: 'KeyP',
          ctrlKey: true,
          altKey: true,
          bubbles: true
        })
      )
    })

    // Dialog should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Importuj przepis|Import Recipe/i })
    ).toBeInTheDocument()
    expect(screen.getAllByText(/CTRL \+ ALT \+ P/i).length).toBeGreaterThanOrEqual(1)
  })

  it('Flow 02: Opens JsonRecipeImportDialog upon clicking the shortcut button in DesktopHeader', async () => {
    render(
      <DesktopLayout
        activeTab="products"
        onTabChange={vi.fn()}
        headerTitle="Produkty"
      >
        <div>Lista Produktów</div>
      </DesktopLayout>
    )

    // Open quick add menu in header first
    const quickAddBtn = screen.getByRole('button', { name: /Dodaj|Add/i })
    await act(async () => {
      fireEvent.click(quickAddBtn)
    })

    const jsonShortcutBtn = screen.getByText(/Importuj przepis|Import Recipe/i)
    await act(async () => {
      fireEvent.click(jsonShortcutBtn)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Importuj przepis|Import Recipe/i })
    ).toBeInTheDocument()
  })
})

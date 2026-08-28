import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HouseholdsDialog } from '../HouseholdsDialog'
import { useAuth } from '@/context/AuthContext'

vi.mock('@/context/AuthContext')
vi.mock('@/hooks/useDeviceLayout', () => ({
  useDeviceLayout: () => ({ isDesktop: true })
}))

describe('HouseholdsDialog Flow - Top Creation, Inline Rename & Switching', () => {
  const mockSwitchHousehold = vi.fn()
  const mockUpdateHouseholdName = vi.fn().mockResolvedValue(true)
  const mockCreateHousehold = vi.fn().mockResolvedValue({ id: 'hh-new-1', name: 'Nowy Dom' })
  const mockDeleteHousehold = vi.fn().mockResolvedValue(true)
  const mockSetDefaultHousehold = vi.fn().mockResolvedValue(true)
  const mockReorderHouseholds = vi.fn()
  const mockAddUserToHousehold = vi.fn().mockResolvedValue({ success: true, message: 'Added' })
  const mockGetHouseholdMembers = vi.fn().mockResolvedValue({ members: [], invites: [] })

  const mockHouseholds = [
    { id: 'hh-1', name: 'Gospodarstwo Domowe', created_at: '2026-08-01' },
    { id: 'hh-2', name: 'Domek Letniskowy', created_at: '2026-08-10' },
    { id: 'hh-3', name: 'Biuro', created_at: '2026-08-15' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      household: mockHouseholds[0],
      userHouseholds: mockHouseholds,
      userProfile: { id: 'user-1', household_id: 'hh-1', name: 'Jan', email: 'jan@example.com' },
      switchHousehold: mockSwitchHousehold,
      updateHouseholdName: mockUpdateHouseholdName,
      setDefaultHousehold: mockSetDefaultHousehold,
      reorderHouseholds: mockReorderHouseholds,
      createHousehold: mockCreateHousehold,
      deleteHousehold: mockDeleteHousehold,
      addUserToHousehold: mockAddUserToHousehold,
      getHouseholdMembers: mockGetHouseholdMembers
    } as any)
  })

  it('Flow 01: Places "Utwórz Nowe Gospodarstwo" at top and does not render separate "Aktywne Gospodarstwo" card', () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    // Should NOT render separate "Aktywne Gospodarstwo" section
    expect(screen.queryByText('Aktywne Gospodarstwo')).not.toBeInTheDocument()

    // "Utwórz Nowe Gospodarstwo" should be visible
    expect(screen.getByText(/Utwórz Nowe Gospodarstwo|Create New Household/i)).toBeInTheDocument()

    // Creation input should be present
    expect(screen.getByPlaceholderText(/Wpisz nazwę gospodarstwa\.\.\.|Enter household name\.\.\./i)).toBeInTheDocument()
  })

  it('Flow 02: Creates a new household when submitting top create form', async () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    const input = screen.getByPlaceholderText(/Wpisz nazwę gospodarstwa\.\.\.|Enter household name\.\.\./i)
    const createButton = screen.getByRole('button', { name: /Utwórz|Create/i })

    fireEvent.change(input, { target: { value: 'Nowy Dom' } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockCreateHousehold).toHaveBeenCalledWith('Nowy Dom')
      expect(mockSwitchHousehold).toHaveBeenCalledWith('hh-new-1')
    })
  })

  it('Flow 03: Switches active household when clicking on a household row', () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    // Click on the second household row
    const secondRow = screen.getByText('Domek Letniskowy')
    fireEvent.click(secondRow.closest('div')!)

    expect(mockSwitchHousehold).toHaveBeenCalledWith('hh-2')
  })

  it('Flow 04: Allows inline rename by clicking on household name without switching household', async () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    const nameSpan = screen.getByText('Gospodarstwo Domowe')
    // Click on name to enter inline edit
    fireEvent.click(nameSpan)

    // Should now show inline input with current name
    const editInput = screen.getByDisplayValue('Gospodarstwo Domowe')
    expect(editInput).toBeInTheDocument()

    // Type new name and save
    fireEvent.change(editInput, { target: { value: 'Nasz Ciepły Dom' } })
    const saveButton = screen.getByTitle(/Zapisz|Save/i)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateHouseholdName).toHaveBeenCalledWith('hh-1', 'Nasz Ciepły Dom')
      // Did NOT trigger switchHousehold
      expect(mockSwitchHousehold).not.toHaveBeenCalled()
    })
  })

  it('Flow 05: Opens DeleteHouseholdDialog when clicking trash icon on a household row', () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    const deleteButtons = screen.getAllByTitle(/Usuń gospodarstwo|Delete household/i)
    expect(deleteButtons.length).toBe(3)

    fireEvent.click(deleteButtons[1])

    // Delete confirmation modal should open for 'Domek Letniskowy'
    expect(screen.getByTestId('expected-confirmation-phrase')).toHaveTextContent(/Domek Letniskowy/i)
  })

  it('Flow 06: Changes default household when clicking the Star button to the left of the delete button', async () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    // Find star button for non-default household 'Domek Letniskowy'
    const starButtons = screen.getAllByLabelText(/Ustaw to gospodarstwo jako domyślne|Set this household as my default|Domyślne|Default/i)
    expect(starButtons.length).toBe(3)

    // First one is already default, second is not
    fireEvent.click(starButtons[1])

    await waitFor(() => {
      expect(mockSetDefaultHousehold).toHaveBeenCalledWith('hh-2')
    })
  })

  it('Flow 07: Triggers drag and drop reordering and invokes reorderHouseholds', () => {
    render(<HouseholdsDialog open={true} onOpenChange={vi.fn()} />)

    const draggableCards = screen.getAllByTitle(/Przeciągnij, aby zmienić kolejność/i)
    expect(draggableCards.length).toBe(2) // non-default households hh-2 and hh-3

    // Drag from index 2 to index 1
    const householdCards = screen.getAllByText(/Gospodarstwo Domowe|Domek Letniskowy|Biuro/i)
      .map((el) => el.closest('[draggable]'))
      .filter(Boolean) as HTMLElement[]

    // Start drag on Biuro (index 2 in userHouseholds, index 1 in draggable list)
    fireEvent.dragStart(householdCards[1])
    // Drop on Domek Letniskowy
    fireEvent.drop(householdCards[0])

    expect(mockReorderHouseholds).toHaveBeenCalled()
  })
})

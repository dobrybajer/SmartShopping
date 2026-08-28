import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteHouseholdDialog } from '../DeleteHouseholdDialog'

describe('DeleteHouseholdDialog Safety Confirmation Flow', () => {
  const mockConfirmDelete = vi.fn().mockResolvedValue(true)
  const mockOpenChange = vi.fn()

  const sampleHousehold = {
    id: 'household-uuid-123',
    name: 'Nasz Dom'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Flow 01: Renders warning and displays expected phrase containing household name + 6 random letters', () => {
    render(
      <DeleteHouseholdDialog
        open={true}
        onOpenChange={mockOpenChange}
        household={sampleHousehold}
        onConfirmDelete={mockConfirmDelete}
      />
    )

    expect(
      screen.getByRole('heading', { name: /Usuń Gospodarstwo|Delete Household/i })
    ).toBeInTheDocument()

    const phraseElement = screen.getByTestId('expected-confirmation-phrase')
    expect(phraseElement).toBeInTheDocument()
    const phraseText = phraseElement.textContent || ''

    // Must start with household name
    expect(phraseText.startsWith('Nasz Dom ')).toBe(true)

    // Suffix must be 6 letters
    const code = phraseText.replace('Nasz Dom ', '')
    expect(code).toMatch(/^[A-Z]{6}$/)

    // Confirm button must be disabled initially
    const deleteButton = screen.getByTestId('confirm-delete-household-button')
    expect(deleteButton).toBeDisabled()
  })

  it('Flow 02: Keeps delete button disabled on incorrect or partial input', () => {
    render(
      <DeleteHouseholdDialog
        open={true}
        onOpenChange={mockOpenChange}
        household={sampleHousehold}
        onConfirmDelete={mockConfirmDelete}
      />
    )

    const input = screen.getByTestId('delete-confirmation-input')
    const deleteButton = screen.getByTestId('confirm-delete-household-button')

    // Partially typed name
    fireEvent.change(input, { target: { value: 'Nasz' } })
    expect(deleteButton).toBeDisabled()

    // Full name only without code
    fireEvent.change(input, { target: { value: 'Nasz Dom' } })
    expect(deleteButton).toBeDisabled()

    // Wrong code
    fireEvent.change(input, { target: { value: 'Nasz Dom WRONG1' } })
    expect(deleteButton).toBeDisabled()
  })

  it('Flow 03: Enables delete button only when input exactly matches expected phrase and calls onConfirmDelete', async () => {
    render(
      <DeleteHouseholdDialog
        open={true}
        onOpenChange={mockOpenChange}
        household={sampleHousehold}
        onConfirmDelete={mockConfirmDelete}
      />
    )

    const phraseText = screen.getByTestId('expected-confirmation-phrase').textContent || ''
    const input = screen.getByTestId('delete-confirmation-input')
    const deleteButton = screen.getByTestId('confirm-delete-household-button')

    // Type the exact required phrase
    fireEvent.change(input, { target: { value: phraseText } })
    expect(deleteButton).not.toBeDisabled()

    // Click confirm delete
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockConfirmDelete).toHaveBeenCalledWith('household-uuid-123')
      expect(mockOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Flow 04: Displays error message if backend deletion fails', async () => {
    mockConfirmDelete.mockResolvedValueOnce(false)

    render(
      <DeleteHouseholdDialog
        open={true}
        onOpenChange={mockOpenChange}
        household={sampleHousehold}
        onConfirmDelete={mockConfirmDelete}
      />
    )

    const phraseText = screen.getByTestId('expected-confirmation-phrase').textContent || ''
    const input = screen.getByTestId('delete-confirmation-input')
    const deleteButton = screen.getByTestId('confirm-delete-household-button')

    fireEvent.change(input, { target: { value: phraseText } })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockConfirmDelete).toHaveBeenCalledWith('household-uuid-123')
      expect(mockOpenChange).not.toHaveBeenCalledWith(false)
      expect(
        screen.getByText(/Nie udało się usunąć gospodarstwa|Failed to delete household/i)
      ).toBeInTheDocument()
    })
  })

  it('Flow 05: Copies confirmation phrase to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    })

    render(
      <DeleteHouseholdDialog
        open={true}
        onOpenChange={mockOpenChange}
        household={sampleHousehold}
        onConfirmDelete={mockConfirmDelete}
      />
    )

    const phraseText = screen.getByTestId('expected-confirmation-phrase').textContent || ''
    const copyButton = screen.getByRole('button', { name: /Kopiuj|Copied/i })

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(phraseText)
    })
  })
})

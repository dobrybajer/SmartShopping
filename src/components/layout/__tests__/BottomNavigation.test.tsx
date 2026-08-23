import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation } from '../BottomNavigation';

describe('BottomNavigation - UI Interaction & User Flow Suite', () => {
  it('Flow 01: renders all 5 main navigation tabs with correct labels', () => {
    render(<BottomNavigation activeTab="cookbook" onTabChange={() => {}} />);

    expect(screen.getByText('Przepisy')).toBeInTheDocument();
    expect(screen.getByText('Produkty')).toBeInTheDocument();
    expect(screen.getByText('Koszyk')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
    expect(screen.getByText('Historia')).toBeInTheDocument();
  });

  it('Flow 02: applies active highlight style to currently selected tab', () => {
    render(
      <BottomNavigation activeTab="draft" onTabChange={() => {}} />
    );

    const draftButton = screen.getByText('Koszyk').closest('button');
    expect(draftButton).toHaveClass('text-emerald-400');
  });

  it('Flow 03: renders badge counters when draft and active counts are greater than 0', () => {
    render(
      <BottomNavigation
        activeTab="cookbook"
        onTabChange={() => {}}
        draftCount={3}
        activeCount={7}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('Flow 04: formats badge counter to 99+ when item count exceeds 99', () => {
    render(
      <BottomNavigation
        activeTab="cookbook"
        onTabChange={() => {}}
        draftCount={120}
      />
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('Flow 05: calls onTabChange and triggers haptic vibration when user clicks a tab', () => {
    const handleTabChange = vi.fn();
    const vibrateSpy = vi.spyOn(navigator, 'vibrate');

    render(
      <BottomNavigation activeTab="cookbook" onTabChange={handleTabChange} />
    );

    const activeListButton = screen.getByText('Lista');
    fireEvent.click(activeListButton);

    expect(handleTabChange).toHaveBeenCalledWith('active');
    expect(vibrateSpy).toHaveBeenCalledWith(20);
  });
});

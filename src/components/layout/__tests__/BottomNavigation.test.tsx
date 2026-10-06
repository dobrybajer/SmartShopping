import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation } from '../BottomNavigation';
import { useI18nStore } from '@/i18n';

describe('BottomNavigation - UI Interaction & User Flow Suite', () => {
  beforeEach(() => {
    useI18nStore.getState().setLanguage('pl');
  });

  it('Flow 01: renders all main navigation tabs with correct Polish labels by default', () => {
    render(<BottomNavigation activeTab="cookbook" onTabChange={() => {}} />);

    expect(screen.getByText('Przepisy')).toBeInTheDocument();
    expect(screen.getByText('Kalendarz')).toBeInTheDocument();
    expect(screen.getByText('Produkty')).toBeInTheDocument();
    expect(screen.getByText('Koszyk')).toBeInTheDocument();
    expect(screen.getByText('Aktywna Lista')).toBeInTheDocument();
    expect(screen.getByText('Historia')).toBeInTheDocument();
    expect(screen.getByText('Spiżarnia')).toBeInTheDocument();
  });

  it('Flow 02: renders English navigation labels when language is set to EN', () => {
    useI18nStore.getState().setLanguage('en');
    render(<BottomNavigation activeTab="cookbook" onTabChange={() => {}} />);

    expect(screen.getByText('Cookbook')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Active List')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Pantry')).toBeInTheDocument();
  });

  it('Flow 03: applies active highlight style to currently selected tab', () => {
    render(
      <BottomNavigation activeTab="draft" onTabChange={() => {}} />
    );

    const draftButton = screen.getByText('Koszyk').closest('button');
    expect(draftButton).toHaveClass('text-primary');
  });

  it('Flow 04: renders badge counters when draft and active counts are greater than 0', () => {
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

  it('Flow 05: formats badge counter to 99+ when item count exceeds 99', () => {
    render(
      <BottomNavigation
        activeTab="cookbook"
        onTabChange={() => {}}
        draftCount={120}
      />
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('Flow 06: calls onTabChange and triggers haptic vibration when user clicks a tab', () => {
    const handleTabChange = vi.fn();
    const vibrateSpy = vi.spyOn(navigator, 'vibrate');

    render(
      <BottomNavigation activeTab="cookbook" onTabChange={handleTabChange} />
    );

    const activeListButton = screen.getByText('Aktywna Lista');
    fireEvent.click(activeListButton);

    expect(handleTabChange).toHaveBeenCalledWith('active');
    expect(vibrateSpy).toHaveBeenCalledWith(20);
  });
});

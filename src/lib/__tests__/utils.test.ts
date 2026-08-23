import { describe, it, expect } from 'vitest';
import { formatDate, getUnitStep, getNextQuantity, getLocalDateISOString } from '../utils';

describe('Utility Functions - Formatting & Step Logic Flows', () => {
  describe('formatDate', () => {
    it('Flow 01: correctly formats YYYY-MM-DD date string into DD.MM.YYYY format without timezone shifts', () => {
      expect(formatDate('2026-08-23')).toBe('23.08.2026');
      expect(formatDate('2026-01-05')).toBe('05.01.2026');
    });

    it('Flow 02: returns empty string when dateInput is empty or null', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('getUnitStep', () => {
    it('Flow 03: returns step of 100 for grams and milliliters', () => {
      expect(getUnitStep('g')).toBe(100);
      expect(getUnitStep('G')).toBe(100);
      expect(getUnitStep('ml')).toBe(100);
      expect(getUnitStep('ML')).toBe(100);
    });

    it('Flow 04: returns step of 1 for pieces or unknown unit types', () => {
      expect(getUnitStep('szt')).toBe(1);
      expect(getUnitStep(null)).toBe(1);
      expect(getUnitStep(undefined)).toBe(1);
      expect(getUnitStep('opakowanie')).toBe(1);
    });
  });

  describe('getNextQuantity', () => {
    it('Flow 05: increases and decreases quantity by unit step for grams', () => {
      expect(getNextQuantity(200, 'g', 'increase')).toBe(300);
      expect(getNextQuantity(200, 'g', 'decrease')).toBe(100);
    });

    it('Flow 06: increases and decreases quantity by unit step for pieces', () => {
      expect(getNextQuantity(3, 'szt', 'increase')).toBe(4);
      expect(getNextQuantity(3, 'szt', 'decrease')).toBe(2);
    });
  });

  describe('getLocalDateISOString', () => {
    it('Flow 07: formats date into YYYY-MM-DD local format', () => {
      const fixedDate = new Date(2026, 7, 23); // Aug 23, 2026
      expect(getLocalDateISOString(fixedDate)).toBe('2026-08-23');
    });
  });
});

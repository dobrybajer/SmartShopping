import { describe, it, expect } from 'vitest'
import { THEMES, THEME_HSL_TOKENS, type HslTuple } from '../themes'

function hslToRgb([h, s, l]: HslTuple): [number, number, number] {
  const sNorm = s / 100
  const lNorm = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sNorm * Math.min(lNorm, 1 - lNorm)
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [255 * f(0), 255 * f(8), 255 * f(4)]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cNorm = c / 255
    return cNorm <= 0.03928 ? cNorm / 12.92 : Math.pow((cNorm + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(a: HslTuple, b: HslTuple): number {
  const l1 = relativeLuminance(hslToRgb(a))
  const l2 = relativeLuminance(hslToRgb(b))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('NORM-03: WCAG 2.1 AA Contrast Audit Across All 6 Curated Themes', () => {
  it('defines palette tokens for all 6 registered themes', () => {
    expect(THEMES).toHaveLength(6)
    for (const theme of THEMES) {
      expect(THEME_HSL_TOKENS[theme.id]).toBeDefined()
    }
  })

  it('maintains >= 4.5:1 WCAG AA text contrast ratio for all semantic token pairs', () => {
    for (const theme of THEMES) {
      const p = THEME_HSL_TOKENS[theme.id]
      const checks: Array<[string, HslTuple, HslTuple]> = [
        ['foreground on background', p.foreground, p.background],
        ['cardForeground on card', p.cardForeground, p.card],
        ['popoverForeground on popover', p.popoverForeground, p.popover],
        ['primaryForeground on primary', p.primaryForeground, p.primary],
        ['secondaryForeground on secondary', p.secondaryForeground, p.secondary],
        ['destructiveForeground on destructive', p.destructiveForeground, p.destructive],
        ['mutedForeground on background', p.mutedForeground, p.background],
        ['mutedForeground on card', p.mutedForeground, p.card],
        ['primary on background', p.primary, p.background],
        ['primary on card', p.primary, p.card]
      ]

      for (const [label, fg, bg] of checks) {
        const ratio = contrastRatio(fg, bg)
        expect(
          ratio,
          `${theme.id} -> ${label} contrast is ${ratio.toFixed(2)}:1 (must be >= 4.5:1)`
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

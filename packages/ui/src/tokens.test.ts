import { describe, expect, it } from 'vitest';
import { AA_TEXT, contrastRatio } from './contrast';
import { brand, darkTheme, lightTheme, type ThemeColors } from './tokens';

// Every text / background pair the UI is allowed to use must pass WCAG AA (ADR-010).
const textPairs: [keyof ThemeColors, keyof ThemeColors][] = [
  ['foreground', 'background'],
  ['foreground', 'surface'],
  ['muted', 'background'],
  ['muted', 'surface'],
  ['primary', 'surface'],
  ['secondary', 'surface'],
  ['secondaryForeground', 'secondary'],
  ['accentForeground', 'accent'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['success', 'surface'],
  ['success', 'successSurface'],
];

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
])('%s theme', (_name, theme) => {
  it.each(textPairs)('%s on %s meets AA', (text, background) => {
    expect(contrastRatio(theme[text], theme[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('brand colors', () => {
  it('matches the measured ratios documented in ADR-010', () => {
    expect(contrastRatio(brand.navy, brand.white)).toBeCloseTo(14.64, 1);
    expect(contrastRatio(brand.tealDeep, brand.white)).toBeCloseTo(4.81, 1);
    expect(contrastRatio(brand.navy, brand.teal)).toBeCloseTo(5.8, 1);
  });

  it('forbids light teal as text on light backgrounds', () => {
    expect(contrastRatio(brand.teal, brand.white)).toBeLessThan(AA_TEXT);
  });
});

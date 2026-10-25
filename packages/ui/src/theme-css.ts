import { brand, darkTheme, lightTheme, radii, type ThemeColors } from './tokens';

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function vars(prefix: string, entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([key, value]) => `  --mtr-${prefix}${kebab(key)}: ${value};`)
    .join('\n');
}

const themeVars = (theme: ThemeColors) => vars('', { ...theme });

/**
 * Builds theme.css (CSS variables consumed by Tailwind in apps/web) from the TS tokens,
 * so colors are defined once. Regenerate with `pnpm --filter @mtr/ui gen:css` (vitest file snapshot).
 */
export function buildThemeCss(): string {
  return [
    '/* Generated from packages/ui/src/tokens.ts by `pnpm --filter @mtr/ui gen:css`. Do not edit. */',
    ':root {',
    themeVars(lightTheme),
    // Fixed brand colors (e.g. the navy SaaS sidebar) do not change with the theme.
    vars('brand-', brand),
    vars('radius-', radii),
    '}',
    '',
    ':root.dark {',
    themeVars(darkTheme),
    '}',
    '',
  ].join('\n');
}

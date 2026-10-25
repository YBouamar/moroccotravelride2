import { describe, expect, it } from 'vitest';
import { buildThemeCss } from './theme-css';

describe('theme.css', () => {
  // The committed file is a file snapshot: `pnpm --filter @mtr/ui gen:css` rewrites it,
  // and this test fails (including in CI) whenever it drifts from tokens.ts.
  it('is in sync with tokens.ts', async () => {
    await expect(buildThemeCss()).toMatchFileSnapshot('../theme.css');
  });

  it('exposes the brand accent and its foreground', () => {
    const css = buildThemeCss();
    expect(css).toContain('--mtr-accent: #21B6A8;');
    expect(css).toContain('--mtr-accent-foreground: #102A43;');
  });
});

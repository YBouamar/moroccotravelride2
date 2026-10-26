import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath', () => {
  it.each(['/fr/app', '/ar/admin', '/en/app/planning', '/fr'])('accepts %s', (path) => {
    expect(safeNextPath(path, '/fr/app')).toBe(path);
  });

  it.each([
    '//evil.example',
    'https://evil.example/fr/app',
    '/de/app',
    '/fr/../admin',
    '/fr/app?x=1',
    '/\\evil.example',
    undefined,
    42,
  ])('rejects %s', (path) => {
    expect(safeNextPath(path, '/fr/app')).toBe('/fr/app');
  });
});

describe('buildCsp', () => {
  const csp = buildCsp({ nonce: 'abc123', supabaseUrl: 'https://db.example.ma', isDev: false });

  it('only allows nonce-bearing scripts', () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('allows the Supabase API and realtime websocket', () => {
    expect(csp).toContain('https://db.example.ma');
    expect(csp).toContain('wss://db.example.ma');
  });

  it('forbids framing and plugins', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('allows eval only in development (Next.js dev tooling)', () => {
    expect(buildCsp({ nonce: 'n', supabaseUrl: 'http://127.0.0.1:55321', isDev: true })).toContain(
      "'unsafe-eval'",
    );
  });
});

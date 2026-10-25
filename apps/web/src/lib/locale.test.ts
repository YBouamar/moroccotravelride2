import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { getDirection } from './locale';

describe('getDirection', () => {
  it('is rtl for Arabic only', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('fr')).toBe('ltr');
    expect(getDirection('en')).toBe('ltr');
  });

  it('covers every supported locale, French by default', () => {
    expect(routing.locales).toEqual(['fr', 'en', 'ar']);
    expect(routing.defaultLocale).toBe('fr');
  });
});

import { describe, expect, it } from 'vitest';
import { getDirection, toLocale } from './locales';
import ar from './messages/ar.json';
import en from './messages/en.json';
import fr from './messages/fr.json';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});

const catalogs = { fr: flatten(fr), en: flatten(en), ar: flatten(ar) };

describe.each(Object.entries(catalogs))('%s driver messages', (_locale, messages) => {
  it('has the same keys as fr.json', () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(catalogs.fr).sort());
  });

  it('never uses the em dash (project rule 6)', () => {
    expect(Object.values(messages).filter((value) => value.includes('—'))).toEqual([]);
  });
});

describe('locales', () => {
  it('falls back to French and flips Arabic to RTL', () => {
    expect(toLocale('de')).toBe('fr');
    expect(toLocale(undefined)).toBe('fr');
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });
});

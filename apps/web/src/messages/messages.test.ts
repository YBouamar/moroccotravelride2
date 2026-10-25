import { describe, expect, it } from 'vitest';
import ar from './ar.json';
import en from './en.json';
import fr from './fr.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const catalogs = { fr: flatten(fr), en: flatten(en), ar: flatten(ar) };
const reference = Object.keys(catalogs.fr).sort();

describe.each(Object.entries(catalogs))('%s messages', (_locale, messages) => {
  it('has exactly the same keys as fr.json', () => {
    expect(Object.keys(messages).sort()).toEqual(reference);
  });

  it('has no empty strings', () => {
    expect(Object.entries(messages).filter(([, value]) => value.trim() === '')).toEqual([]);
  });

  it('never uses the em dash (project rule 6)', () => {
    expect(Object.entries(messages).filter(([, value]) => value.includes('—'))).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { clientSchema } from './company-schemas';
import { likePattern, pageCount, pageRange, parsePage, toCsv } from './lists';

describe('pagination', () => {
  it('parses page numbers defensively', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it('computes ranges and page counts', () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 19 });
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29 });
    expect(pageCount(0)).toBe(1);
    expect(pageCount(41)).toBe(3);
  });
});

describe('likePattern', () => {
  it('escapes wildcards and filter separators', () => {
    expect(likePattern('  atlas ')).toBe('%atlas%');
    expect(likePattern('50%_off')).toBe('%50\\%\\_off%');
    expect(likePattern('a,b(c)')).toBe('%a b c %');
    expect(likePattern('   ')).toBeNull();
    expect(likePattern(42)).toBeNull();
  });
});

describe('toCsv', () => {
  const columns = [
    { label: 'Nom', value: (row: { name: string; seats: number }) => row.name },
    { label: 'Places', value: (row: { name: string; seats: number }) => row.seats },
  ];

  it('quotes cells and separates with semicolons', () => {
    expect(toCsv(columns, [{ name: 'Van "VIP"', seats: 7 }])).toBe(
      '"Nom";"Places"\r\n"Van ""VIP""";"7"\r\n',
    );
  });

  it('neutralizes formula injection', () => {
    expect(toCsv(columns, [{ name: '=HYPERLINK("x")', seats: 1 }])).toContain(
      `"'=HYPERLINK(""x"")"`,
    );
    expect(toCsv(columns, [{ name: '-2+3', seats: 1 }])).toContain(`"'-2+3"`);
  });
});

describe('clientSchema', () => {
  it('requires the ICE format only for B2B clients', () => {
    const base = { name: 'Hotel Atlas', email: '', phone: '', address: '', notes: '' };
    expect(clientSchema.safeParse({ ...base, type: 'b2b', ice: '001234567000089' }).success).toBe(
      true,
    );
    expect(clientSchema.safeParse({ ...base, type: 'b2b', ice: '123' }).success).toBe(false);
    expect(clientSchema.parse({ ...base, type: 'b2c', ice: '001234567000089' }).ice).toBe('');
  });
});

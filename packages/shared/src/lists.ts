/** Server-side lists (step 8): pagination, safe search, CSV export. */

export const PAGE_SIZE = 20;

/** Page number from a query string value (1 when missing or invalid). */
export function parsePage(value: unknown): number {
  const page = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Inclusive row range for Supabase `.range(from, to)`. */
export function pageRange(page: number, size = PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * Search term for an ILIKE pattern: trimmed, limited, wildcards escaped so that "%" or "_"
 * typed by the user match literally. Returns null when there is nothing to search.
 */
export function likePattern(term: unknown): string | null {
  if (typeof term !== 'string') return null;
  const cleaned = term.trim().slice(0, 100);
  if (!cleaned) return null;
  // PostgREST "or" filters use commas and parentheses as separators: drop them.
  const safe = cleaned.replace(/[(),]/g, ' ').replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${safe}%`;
}

export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

/**
 * CSV with ";" separators (what Excel expects in French locales), quoted cells and protection
 * against formula injection: cells starting with = + - @ are prefixed with an apostrophe.
 */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const cell = (raw: unknown) => {
    let text = raw === null || raw === undefined ? '' : String(raw);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [
    columns.map((column) => cell(column.label)).join(';'),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(';')),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

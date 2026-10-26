import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  empty: string;
  caption: string;
}

/** Plain semantic table: scrolls horizontally on small screens instead of breaking the page. */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  caption,
}: DataTableProps<T>) {
  return (
    <Card className="overflow-x-auto p-0">
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 text-start font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className ?? 'px-4 py-3'}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

import type { Json } from '@mtr/db';
import { getFormatter, getTranslations } from 'next-intl/server';
import { formatAuditValue, isAuditField, type AuditFormatters } from '../audit-format';

interface AuditEntry {
  id: number;
  occurred_at: string;
  action: string;
  actorName: string | null;
  before: Json | null;
  after: Json | null;
}

const asRecord = (value: Json | null): Record<string, Json> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {};

/** Latest audited changes of a company (actor, action, changed fields before and after). */
export async function AuditList({ entries }: { entries: AuditEntry[] }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  if (entries.length === 0) {
    return <p className="text-sm text-muted">{t('admin.companies.noAudit')}</p>;
  }

  // Dynamic keys are checked with t.has() so an unknown value falls back to the raw text.
  const tAny = t as unknown as ((key: string) => string) & { has: (key: string) => boolean };
  const formatters: AuditFormatters = {
    label: (namespace, value) =>
      tAny.has(`${namespace}.${value}`) ? tAny(`${namespace}.${value}`) : value,
    yesNo: (value) => t(value ? 'common.yes' : 'common.no'),
    dateTime: (value) => format.dateTime(value, { dateStyle: 'medium', timeStyle: 'short' }),
    date: (value) => format.dateTime(value, { dateStyle: 'medium' }),
  };

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => {
        const [entity = '', operation = ''] = entry.action.split('.');
        const before = asRecord(entry.before);
        const after = asRecord(entry.after);
        const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
        const actionKey = `audit.${entity}.${operation}`;
        return (
          <li key={entry.id} className="rounded-control border border-border p-3 text-sm">
            <p className="font-semibold">{tAny.has(actionKey) ? tAny(actionKey) : entry.action}</p>
            <p className="text-muted">
              {formatters.dateTime(new Date(entry.occurred_at))}
              {' · '}
              {entry.actorName ?? t('admin.companies.system')}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {fields.map((field) => (
                <li key={field}>
                  <span className="text-muted">
                    {isAuditField(field) ? t(`audit.fields.${field}`) : field}
                    {' : '}
                  </span>
                  {formatAuditValue(entity, field, before[field], formatters)}
                  {' → '}
                  {formatAuditValue(entity, field, after[field], formatters)}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

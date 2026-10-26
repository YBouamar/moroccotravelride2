import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/lib/locale';

/**
 * Transactional e-mail templates (step 17). Plain HTML built from the translations, every
 * dynamic value escaped. React Email (planned in the stack) can replace them later (BACKLOG).
 */

export const EMAIL_TEMPLATES = [
  'booking_received',
  'booking_new_for_carrier',
  'booking_confirmed',
  'booking_refused',
  'booking_cancelled',
  'deadline_reminder',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type Payload = Record<string, string>;

export async function renderEmail(
  template: EmailTemplate,
  locale: AppLocale,
  payload: Payload,
): Promise<RenderedEmail> {
  const t = await getTranslations({ locale, namespace: 'emails' });
  const values = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, String(value)]),
  );
  // Enum values written by SQL jobs (e.g. the deadline kind) are translated here.
  const kindKey = `kinds.${values.kind}` as 'kinds.insurance';
  if (values.kind && t.has(kindKey)) values.kind = t(kindKey);
  const subject = t(`${template}.subject`, values);
  // Paragraphs are separated by a blank line in the messages; placeholders are filled below.
  const bodyLines = (t.raw(`${template}.body`) as string).split(/\n\n/);
  const paragraphs = bodyLines.map((line) =>
    // Interpolate after escaping: placeholders are replaced by escaped values only.
    escapeHtml(line).replace(/\{(\w+)\}/g, (_, key: string) => escapeHtml(values[key] ?? '')),
  );
  const action = values.link ? { label: t(`${template}.action`), href: values.link } : null;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#F4F8FA;font-family:Inter,Arial,sans-serif;color:#102A43">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;padding:24px">
<tr><td style="font-size:20px;font-weight:700;color:#087E8B;padding-bottom:16px">MoroccoTravelRide</td></tr>
${paragraphs.map((line) => `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:12px">${line}</td></tr>`).join('\n')}
${action ? `<tr><td style="padding:12px 0 4px"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#21B6A8;color:#102A43;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">${escapeHtml(action.label)}</a></td></tr>` : ''}
<tr><td style="font-size:12px;color:#627D98;padding-top:20px">${escapeHtml(t('footer'))}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    ...bodyLines.map((line) => line.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')),
    action ? `${action.label} : ${action.href}` : '',
    t('footer'),
  ]
    .filter(Boolean)
    .join('\n\n');

  return { subject, html, text };
}

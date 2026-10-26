import { pageCount } from '@mtr/shared';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface PaginationProps {
  basePath: string;
  /** Current filters, kept on every page link. */
  params: Record<string, string | undefined>;
  page: number;
  total: number;
}

export function hrefWith(basePath: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function Pagination({ basePath, params, page, total }: PaginationProps) {
  const t = await getTranslations('lists');
  const pages = pageCount(total);
  const link = (target: number) => hrefWith(basePath, { ...params, page: String(target) });

  return (
    <nav
      aria-label={t('pagination')}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted">{t('summary', { total, page: Math.min(page, pages), pages })}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={link(page - 1)} className={buttonVariants({ variant: 'outline' })}>
            {t('previous')}
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={link(page + 1)} className={buttonVariants({ variant: 'outline' })}>
            {t('next')}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

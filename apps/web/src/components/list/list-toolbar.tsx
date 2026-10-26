import { Download, Plus, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';

interface Choice {
  value: string;
  label: string;
}

interface ListToolbarProps {
  /** Page path, without locale (the GET form submits to it). */
  basePath: string;
  q?: string;
  status?: string;
  sort?: string;
  statuses: Choice[];
  sorts: Choice[];
  /** CSV export URL (API route, already carries the filters). */
  exportHref: string;
  /** Shown only to roles allowed to create, with write access. */
  newHref?: string;
  newLabel: string;
}

/**
 * Search, filter and sort as a plain GET form: works without JavaScript, the state lives in the
 * URL (shareable, back button friendly) and the filtering happens on the server.
 */
export async function ListToolbar(props: ListToolbarProps) {
  const t = await getTranslations('lists');
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('search')}
          <Input type="search" name="q" defaultValue={props.q} className="sm:w-64" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('status')}
          <Select name="status" defaultValue={props.status ?? ''} className="sm:w-44">
            <option value="">{t('all')}</option>
            {props.statuses.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('sort')}
          <Select name="sort" defaultValue={props.sort ?? ''} className="sm:w-48">
            {props.sorts.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          <Search aria-hidden="true" />
          {t('apply')}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {/* A plain link: the route handler answers with a file download. */}
        <a href={props.exportHref} className={buttonVariants({ variant: 'outline' })}>
          <Download aria-hidden="true" />
          {t('export')}
        </a>
        {props.newHref ? (
          <Link href={props.newHref} className={buttonVariants()}>
            <Plus aria-hidden="true" />
            {props.newLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

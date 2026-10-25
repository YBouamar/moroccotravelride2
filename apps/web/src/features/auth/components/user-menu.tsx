import { LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { signOutAction } from '../actions';

export function UserMenu({ name }: { name: string }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-foreground sm:inline">{name}</span>
      <form action={signOutAction.bind(null, locale)}>
        <Button type="submit" variant="ghost" size="md">
          <LogOut aria-hidden="true" className="rtl:rotate-180" />
          {t('logout')}
        </Button>
      </form>
    </div>
  );
}

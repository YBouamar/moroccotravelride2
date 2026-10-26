import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  places: { id: string; name: string; isAirport: boolean }[];
  /** Earliest bookable day (BR-006), for the date picker only: the server checks again. */
  minDay: string;
  defaults?: { from?: string; to?: string; date?: string; time?: string; passengers?: number };
  /** `dark` on the navy hero (white labels). */
  tone?: 'light' | 'dark';
  /** Locale-prefixed path of the results page. */
  action: string;
}

/** Plain GET form: works without JavaScript and the search lives in the URL (shareable). */
export async function SearchForm({
  places,
  minDay,
  defaults,
  tone = 'light',
  action,
}: SearchFormProps) {
  const t = await getTranslations('search');
  const label = cn(tone === 'dark' && 'text-white');
  const cities = places.filter((place) => !place.isAirport);
  const airports = places.filter((place) => place.isAirport);
  const options = (
    <>
      <option value="">{t('placePlaceholder')}</option>
      <optgroup label={t('cities')}>
        {cities.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </optgroup>
      <optgroup label={t('airports')}>
        {airports.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </optgroup>
    </>
  );

  return (
    <form
      method="get"
      action={action}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
    >
      <div className="flex flex-col gap-1.5 lg:col-span-2">
        <Label htmlFor="search-from" className={label}>
          {t('from')}
        </Label>
        <Select id="search-from" name="from" required defaultValue={defaults?.from ?? ''}>
          {options}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 lg:col-span-2">
        <Label htmlFor="search-to" className={label}>
          {t('to')}
        </Label>
        <Select id="search-to" name="to" required defaultValue={defaults?.to ?? ''}>
          {options}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search-date" className={label}>
          {t('date')}
        </Label>
        <Input
          id="search-date"
          type="date"
          name="date"
          required
          min={minDay}
          defaultValue={defaults?.date ?? minDay}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search-time" className={label}>
          {t('time')}
        </Label>
        <Input
          id="search-time"
          type="time"
          name="time"
          required
          defaultValue={defaults?.time ?? '10:00'}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search-passengers" className={label}>
          {t('passengers')}
        </Label>
        <Input
          id="search-passengers"
          type="number"
          name="passengers"
          min={1}
          max={80}
          required
          defaultValue={defaults?.passengers ?? 2}
        />
      </div>
      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-5 lg:justify-self-start">
        <Search aria-hidden="true" />
        {t('submit')}
      </Button>
    </form>
  );
}

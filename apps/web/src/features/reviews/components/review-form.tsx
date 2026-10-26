'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import { cn } from '@/lib/utils';
import { submitReviewAction } from '../actions';

/** Rating from 1 to 5 stars and an optional comment, published after moderation. */
export function ReviewForm({ bookingRef }: { bookingRef: string }) {
  const t = useTranslations();
  const { pending, error, run } = useOnboardingAction();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return <Alert>{t('reviews.thanks')}</Alert>;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => submitReviewAction(bookingRef, { rating, comment }),
          () => setSent(true),
        );
      }}
    >
      {error ? <Alert tone="danger">{t(`onboarding.errors.${error}`)}</Alert> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('reviews.rating')}</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
              />
              <Star
                aria-hidden="true"
                className={cn(
                  'size-8',
                  value <= rating ? 'fill-accent text-secondary' : 'text-border',
                )}
              />
              <span className="sr-only">{t('reviews.stars', { count: value })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="review-comment">{t('reviews.comment')}</Label>
        <Input
          id="review-comment"
          value={comment}
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {t('reviews.submit')}
      </Button>
    </form>
  );
}

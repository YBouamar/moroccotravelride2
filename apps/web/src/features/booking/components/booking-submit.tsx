'use client';

import { Loader2 } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface BookingSubmitProps {
  pending: boolean;
  /** Fields still invalid after a submit attempt (0 hides the reminder). */
  invalidCount: number;
}

// Vertical moves only: nothing to mirror in RTL. `reducedMotion="user"` keeps the fades only.
const swap = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15 },
};

/** Submit button with its sending state, and a reminder of the fields to fix next to it. */
export function BookingSubmit({ pending, invalidCount }: BookingSubmitProps) {
  const t = useTranslations('book');

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {invalidCount > 0 ? (
            <motion.p
              key="to-fix"
              role="alert"
              className="text-sm font-medium text-danger"
              {...swap}
            >
              {t('fieldsToFix', { count: invalidCount })}
            </motion.p>
          ) : null}
        </AnimatePresence>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          // Sending is not "disabled": keep it at full strength, it is working.
          className="w-full aria-busy:cursor-progress aria-busy:disabled:opacity-100 sm:w-auto sm:min-w-64 sm:self-start"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={pending ? 'pending' : 'idle'}
              className="inline-flex items-center gap-2"
              {...swap}
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : null}
              {t(pending ? 'submitting' : 'submit')}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </MotionConfig>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';
import { Button } from './button';

interface ConfirmButtonProps {
  label: string;
  /** Consequence of the action, repeated in the dialog (docs/UX.md: explicit confirmation). */
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

/** Button that asks for confirmation in a native <dialog> (focus trap and Esc built in). */
export function ConfirmButton({
  label,
  description,
  onConfirm,
  disabled,
  variant = 'primary',
}: ConfirmButtonProps) {
  const t = useTranslations('admin.confirm');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card border border-border bg-surface p-6 text-foreground backdrop:bg-navy/60"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant={variant === 'outline' ? 'primary' : variant}
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            {t('confirm')}
          </Button>
        </div>
      </dialog>
    </>
  );
}

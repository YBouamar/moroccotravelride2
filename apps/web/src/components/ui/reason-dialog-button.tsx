'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button } from './button';
import { Input, Label } from './input';

interface ReasonDialogButtonProps {
  label: string;
  title: string;
  description: string;
  reasonLabel: string;
  confirmLabel: string;
  disabled?: boolean;
  /** Called with the trimmed reason (3 characters at least). */
  onConfirm: (reason: string) => void;
}

/** Button opening a native <dialog> that asks for a mandatory reason (cancellation, credit note). */
export function ReasonDialogButton(props: ReasonDialogButtonProps) {
  const t = useTranslations('admin.confirm');
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reason, setReason] = useState('');

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={props.disabled}
        onClick={() => dialog.current?.showModal()}
      >
        {props.label}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card border border-border bg-surface p-6 text-foreground backdrop:bg-navy/60"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length < 3) return;
            dialog.current?.close();
            props.onConfirm(reason.trim());
          }}
          className="flex flex-col gap-4"
        >
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {props.title}
          </h2>
          <p className="text-sm text-muted">{props.description}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-reason`}>{props.reasonLabel}</Label>
            <Input
              id={`${id}-reason`}
              required
              minLength={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>
              {t('cancel')}
            </Button>
            <Button type="submit">{props.confirmLabel}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

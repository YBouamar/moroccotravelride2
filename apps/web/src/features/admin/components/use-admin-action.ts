'use client';

import { useCallback, useState, useTransition } from 'react';
import type { AdminActionResult } from '../actions';

/** Pending state and outcome message of an admin Server Action. */
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult | null>(null);

  const run = useCallback((action: () => Promise<AdminActionResult>) => {
    setResult(null);
    startTransition(async () => setResult(await action()));
  }, []);

  return { pending, result, run };
}

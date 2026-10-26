import { rateToBps } from '@mtr/shared';

/** Default VAT as typed in the forms ("20", "5,5"), empty when not set (ADR-007). */
export const vatInput = (rate: number | null) =>
  rate === null ? '' : String(rateToBps(rate) / 100).replace('.', ',');

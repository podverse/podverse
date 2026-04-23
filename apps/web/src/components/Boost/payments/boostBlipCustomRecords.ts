import { buildCustomRecords } from '@podverse/v4v-btc-ln';

import type { PaymentRecipient } from '../types.js';

export const buildCustomRecordsForRecipient = (
  blipPayload: string | null,
  recipient: PaymentRecipient
): Record<string, string> | undefined =>
  buildCustomRecords(blipPayload, recipient.custom_key, recipient.custom_value);

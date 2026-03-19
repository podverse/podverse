export type PaymentRecipient = {
  id: string;
  type: string;
  recipient_type?: string | null;
  address: string;
  name: string | null;
  custom_key?: string | null;
  custom_value?: string | null;
  normalized_split: number;
  final_amount: number;
};

export type RecipientStatus = PaymentRecipient & {
  status: 'pending' | 'paying' | 'success' | 'failed';
  /** Main user-facing error message (e.g. "Unable to fetch LNURL invoice...", timeout, or wallet message). May include "Retry N:" when no errorDetails. */
  error?: string;
  /** Raw reason from provider (e.g. response body); shown only when it adds info not already in error (avoids duplicate text). */
  errorProviderMessage?: string;
  /** Number of retries performed before final failure; used for summary text and to build "Retry N:" when errorDetails is not set. */
  errorRetries?: number;
  /** Per-attempt error messages (e.g. LNURL invoice retries), shown in order with "Retry N:" for index ≥ 1. When set, UI shows these instead of a single error line. */
  errorDetails?: string[];
};

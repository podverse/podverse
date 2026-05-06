/**
 * Billing-related VARCHAR/CHAR lengths.
 *
 * Keep in sync with linear migrations (e.g. `0028_billing_pricing_catalog.sql`,
 * `0029_billing_events_and_retry_metadata.sql`). Migrations remain the DDL source of truth.
 */
export const BILLING_IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/** ISO 4217 alphabetic currency codes (`billing_price.currency_code`). */
export const ISO_4217_CURRENCY_CODE_CHAR_LENGTH = 3;

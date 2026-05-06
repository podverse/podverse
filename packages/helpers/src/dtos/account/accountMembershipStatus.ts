import type { BillingCadence } from '../../lib/billingDomain.js';

export interface DTOAccountMembershipStatus {
  id: number;
  account_id: number;
  account_membership_id: number;
  membership_expires_at: string | null;
  auto_renew: boolean;
  billing_cadence: BillingCadence | null;
  auto_renew_mode: 'off' | 'on';
  next_renewal_attempt_at: string | null;
  last_renewal_attempt_at: string | null;
  last_renewal_status: 'none' | 'succeeded' | 'failed';
  last_extension_idempotency_key: string | null;
  last_renewal_idempotency_key: string | null;
  renewal_retry_count: number;
  renewal_retry_backoff_until: string | null;
  allow_directory_add_by_rss: boolean | null;
  max_add_by_rss_feeds: number | null;
  max_manual_refreshes_per_hour: number | null;
  track_stats: boolean | null;
  allow_notifications: boolean | null;
}

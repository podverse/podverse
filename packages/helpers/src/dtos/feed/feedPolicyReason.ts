/**
 * Canonical `feed_policy.primary_block_reason` keys (matches ORM `FeedPolicyReasonEnum`, without importing ORM).
 * @see docs in `packages/orm/src/entities/feed/feedPolicy.ts`
 */

export const FEED_POLICY_PRIMARY_BLOCK_REASON_KEYS = [
  'spam_detected',
  'oversized_detected',
  'takedown_active',
  'manual_block',
] as const;

export type FeedPolicyPrimaryBlockReasonKey =
  (typeof FEED_POLICY_PRIMARY_BLOCK_REASON_KEYS)[number];

export function parseFeedPolicyPrimaryBlockReason(
  raw: string | null | undefined
): FeedPolicyPrimaryBlockReasonKey | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const s = String(raw).trim();
  if (s === '') {
    return null;
  }
  for (const k of FEED_POLICY_PRIMARY_BLOCK_REASON_KEYS) {
    if (k === s) {
      return k;
    }
  }
  return null;
}

/** Resolved label for i18n: known enum keys or `unknown` when API sent an unrecognized non-empty value. */
export type FeedPolicyPrimaryBlockReasonForUi = FeedPolicyPrimaryBlockReasonKey | 'unknown';

export function primaryBlockReasonForUi(
  raw: string | null | undefined
): FeedPolicyPrimaryBlockReasonForUi | null {
  const parsed = parseFeedPolicyPrimaryBlockReason(raw);
  if (parsed !== null) {
    return parsed;
  }
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
    return 'unknown';
  }
  return null;
}

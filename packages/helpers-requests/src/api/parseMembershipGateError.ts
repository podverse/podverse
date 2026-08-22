/**
 * Membership / entitlement denials return HTTP 403 with a structured JSON body whose `i18nKey` is under
 * the `membership.*` namespace (e.g. `membership.membership_expired`,
 * `membership.feature_not_available_for_account_type`, `membership.add_by_rss_feed_limit_reached`,
 * `membership.manual_refresh_hourly_limit_reached`), alongside a machine-readable `code` and a
 * `renewPath` destination.
 *
 * This is the single shared detector/parser every client (web and mobile) uses to recognise and read
 * that contract, so the apps cannot drift. It returns `null` when the error is not a membership-gate
 * 403. `i18nKey` distinguishes the denial reason (expired vs premium-feature vs limit) for message copy;
 * the renew/sign-up button label is auth-based at the call site, not derived from this payload.
 */
export interface MembershipGateError {
  /** Machine-readable code (e.g. `membership_expired`, `feature_not_available_for_account_type`). */
  code?: string;
  /** Namespaced i18n key under `membership.*` used to localise the user-facing message. */
  i18nKey: string;
  /** Server message (American English structural text); clients prefer their localised copy. */
  message?: string;
  /** Renew/extend destination path (web route; native clients map it to their membership screen). */
  renewPath?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Parses a thrown request error (axios-style `error.response.{status,data}`) into a
 * {@link MembershipGateError}, or returns `null` when it is not a `membership.*` 403.
 */
export function parseMembershipGateError(error: unknown): MembershipGateError | null {
  if (!isRecord(error)) {
    return null;
  }

  const response = error.response;
  if (!isRecord(response) || response.status !== 403) {
    return null;
  }

  const data = response.data;
  if (!isRecord(data)) {
    return null;
  }

  const i18nKey = data.i18nKey;
  if (typeof i18nKey !== 'string' || !i18nKey.startsWith('membership.')) {
    return null;
  }

  return {
    code: readOptionalString(data.code),
    i18nKey,
    message: readOptionalString(data.message),
    renewPath: readOptionalString(data.renewPath),
  };
}

/**
 * The two `membership.*` `i18nKey`s that carry distinct denial semantics. Limit keys
 * (`membership.add_by_rss_feed_limit_reached`, `membership.manual_refresh_hourly_limit_reached`, …) are
 * open-ended, so they are matched by falling through in {@link membershipDenialReason} rather than
 * enumerated here.
 */
export const MEMBERSHIP_GATE_I18N_KEYS = {
  expired: 'membership.membership_expired',
  featureNotAvailable: 'membership.feature_not_available_for_account_type',
} as const;

/** Coarse denial reason for message/banner copy (button label stays auth-based at the call site). */
export type MembershipDenialReason = 'expired' | 'insufficient_tier' | 'limit';

/** Categorises a membership 403 `i18nKey` into a {@link MembershipDenialReason}. */
export function membershipDenialReason(i18nKey: string): MembershipDenialReason {
  if (i18nKey === MEMBERSHIP_GATE_I18N_KEYS.expired) {
    return 'expired';
  }
  if (i18nKey === MEMBERSHIP_GATE_I18N_KEYS.featureNotAvailable) {
    return 'insufficient_tier';
  }
  return 'limit';
}

/** Rolling window for MetaBoost mint POST; must match prior express-rate-limit config (1 / user / minute). */
export const METABOOST_MINT_WINDOW_MS = 60_000;

const blockedUntilByAccountId = new Map<number, number>();

export type MetaboostMintRateLimitInfo = {
  allowed: boolean;
  /** Milliseconds until the user may mint again (0 when allowed). */
  retryAfterMs: number;
  /** Same as retryAfterMs when not allowed; 0 when allowed. */
  timeUntilResetMs: number;
};

function computeInfo(accountId: number): MetaboostMintRateLimitInfo {
  const now = Date.now();
  const until = blockedUntilByAccountId.get(accountId);
  if (until === undefined || now >= until) {
    return { allowed: true, retryAfterMs: 0, timeUntilResetMs: 0 };
  }
  const timeUntilResetMs = until - now;
  return {
    allowed: false,
    retryAfterMs: timeUntilResetMs,
    timeUntilResetMs,
  };
}

/** Read-only: whether the next mint POST would succeed or return 429. */
export function peekMetaboostMintRateLimit(accountId: number): MetaboostMintRateLimitInfo {
  return computeInfo(accountId);
}

/** Consume one mint slot if allowed; otherwise returns the same shape as a 429 would use. */
export function tryConsumeMetaboostMintRateLimit(accountId: number): MetaboostMintRateLimitInfo {
  const info = computeInfo(accountId);
  if (!info.allowed) {
    return info;
  }
  blockedUntilByAccountId.set(accountId, Date.now() + METABOOST_MINT_WINDOW_MS);
  return { allowed: true, retryAfterMs: 0, timeUntilResetMs: 0 };
}

/** JSON body for POST mint when rate limited (aligned with rateLimiter.ts buildHandler). */
export function buildMetaboostMintRateLimit429Body(info: MetaboostMintRateLimitInfo): {
  tooManyRequests: true;
  timeUntilResetMs: number;
  minutesRemaining: number;
} {
  const timeUntilResetMs = info.timeUntilResetMs;
  const minutesRemainingRaw = Math.ceil(timeUntilResetMs / 60000);
  const minutesRemaining = minutesRemainingRaw < 1 ? 1 : minutesRemainingRaw;
  return {
    tooManyRequests: true,
    timeUntilResetMs,
    minutesRemaining,
  };
}

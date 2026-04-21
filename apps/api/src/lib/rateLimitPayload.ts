export function deriveRateLimitResetTimeMs(
  resetTime: Date | undefined,
  windowMs: number,
  nowMs: number
): number {
  return resetTime ? resetTime.getTime() : nowMs + windowMs;
}

export function buildRateLimit429Body(timeUntilResetMs: number): {
  tooManyRequests: true;
  timeUntilResetMs: number;
  minutesRemaining: number;
} {
  const minutesRemainingRaw = Math.ceil(timeUntilResetMs / 60000);
  const minutesRemaining = minutesRemainingRaw < 1 ? 1 : minutesRemainingRaw;
  return {
    tooManyRequests: true,
    timeUntilResetMs,
    minutesRemaining,
  };
}

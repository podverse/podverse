type ErrorWithResponse = {
  response?: { status?: number; data?: RateLimitData };
  status?: number;
  code?: number;
  data?: RateLimitData;
  body?: RateLimitData;
};

type RateLimitData =
  | {
      tooManyRequests?: boolean;
      minutesRemaining?: number;
      retry_after_seconds?: number;
    }
  | Blob;

type RateLimitAlertOptions = {
  onMessage?: (message: string) => void;
  suppressAlert?: boolean;
};

export async function handleRateLimitAlert(
  error: unknown,
  _locale?: string,
  tMisc?: (key: string, values?: Record<string, string | number>) => string,
  options?: RateLimitAlertOptions
): Promise<boolean> {
  const e = error as ErrorWithResponse;
  const status = e?.response?.status ?? e?.status ?? e?.code;

  let data: RateLimitData | undefined = e?.response?.data ?? e?.data ?? e?.body;

  // If data is a Blob (can happen with responseType: 'blob'), convert to JSON
  if (status === 429 && data instanceof Blob) {
    try {
      const blobText = await data.text();
      data = JSON.parse(blobText) as RateLimitData;
      // Update the error object with parsed data for consistency
      if (e?.response) {
        e.response.data = data;
      } else if (e && 'data' in e) {
        e.data = data;
      }
    } catch (parseError) {
      // If parsing fails, can't handle rate limit
      console.error('[handleRateLimitAlert] Failed to parse blob error response:', parseError);
      return false;
    }
  }

  // After potential blob conversion, data should not be a Blob
  const rateLimitData = data instanceof Blob ? undefined : data;
  if (status === 429) {
    const minutesRemaining = rateLimitData?.minutesRemaining;
    const retryAfterSeconds = rateLimitData?.retry_after_seconds;
    const fallbackMinutes = typeof retryAfterSeconds === 'number' ? retryAfterSeconds / 60 : null;
    const rateLimitMinutes =
      typeof minutesRemaining === 'number' ? minutesRemaining : fallbackMinutes;
    const isRateLimit = rateLimitData?.tooManyRequests || typeof rateLimitMinutes === 'number';
    if (!isRateLimit) {
      return false;
    }
    const normalizedMinutes =
      typeof rateLimitMinutes === 'number' ? Math.max(1, Math.ceil(rateLimitMinutes)) : null;
    if (normalizedMinutes === null || isNaN(normalizedMinutes) || normalizedMinutes < 1) {
      const genericMessage = tMisc
        ? tMisc('rate_limit.generic')
        : 'Rate limited: please try again later.';
      options?.onMessage?.(genericMessage);
      if (!options?.suppressAlert) {
        alert(genericMessage);
      }
      return true;
    }

    let message: string;
    if (tMisc) {
      const key =
        normalizedMinutes === 1 ? 'rate_limit.minute_remaining' : 'rate_limit.minutes_remaining';
      const templated = tMisc(key, { minutes: normalizedMinutes });
      if (!templated || templated.includes(key)) {
        // Fallback to generic if translation missing
        message = tMisc('rate_limit.generic');
      } else {
        message = templated;
      }
    } else {
      message =
        normalizedMinutes === 1
          ? 'Rate limited: 1 minute until you can use this action again.'
          : `Rate limited: ${normalizedMinutes} minutes until you can use this action again.`;
    }
    options?.onMessage?.(message);
    if (!options?.suppressAlert) {
      alert(message);
    }
    return true;
  }

  return false;
}

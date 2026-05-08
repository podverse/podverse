/**
 * Membership / entitlement denials return HTTP 403 with structured JSON (`i18nKey` under `membership.*`).
 * Those responses are normal UX for the client and should not be logged as API errors.
 */
export function skipApiRequestErrorLogForMembershipGate(errorInfo: {
  status?: number;
  responseData?: unknown;
}): boolean {
  if (errorInfo.status !== 403) {
    return false;
  }
  const data = errorInfo.responseData;
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const key = (data as { i18nKey?: unknown }).i18nKey;
  return typeof key === 'string' && key.startsWith('membership.');
}

/**
 * Returns the effective User-Agent string: raw value if non-empty, otherwise brand + suffix.
 * Callers must pass brandName (required by env validation); no fallback.
 */
export function getEffectiveUserAgent(params: {
  userAgentRaw: string | undefined;
  brandName: string;
  suffix: string;
}): string {
  const raw = params.userAgentRaw?.trim();
  if (raw !== undefined && raw !== '') return raw;
  return params.brandName.trim() + params.suffix;
}

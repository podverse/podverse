/**
 * Pure helpers for feed URL handling and parsing-window math (unit-test friendly).
 */

export function deriveHttpsAndHttpUrlsFromInput(inputUrl: string): {
  base: string;
  httpsUrl: string;
  httpUrl: string;
} {
  const base = inputUrl.replace(/^https?:\/\//i, '');
  return {
    base,
    httpsUrl: `https://${base}`,
    httpUrl: `http://${base}`,
  };
}

/** Cutoff time before which an existing is_parsing timestamp is considered stale. */
export function computeParsingStaleBefore(nowMs: number, maxParsingAgeMinutes: number): Date {
  return new Date(nowMs - maxParsingAgeMinutes * 60 * 1000);
}

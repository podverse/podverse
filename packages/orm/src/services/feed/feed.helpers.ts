/**
 * Pure helpers for feed URL handling and parsing-window math (unit-test friendly).
 */

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

export function deriveHttpsAndHttpUrlsFromInput(inputUrl: string): {
  base: string;
  httpsUrl: string;
  httpUrl: string;
} {
  // Normalize the input first so the base strip/re-add works on encoded URLs.
  const normalized = canonicalHttpOrHttpsUrl(inputUrl) ?? inputUrl;
  const base = normalized.replace(/^https?:\/\//i, '');
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

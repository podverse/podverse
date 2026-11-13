import { DEFAULT_HTTP_TIMEOUT_MS } from '../timeConstants.js';

export type AddByRSSHostRequestSpacing = {
  /** Requests that share a key share one spacing budget. */
  key: string;
  spacingMs: number;
};

/** Hosts that rate-limit feed fetches hard enough that requests must be spaced out. */
const HOST_REQUEST_SPACING_RULES: readonly (AddByRSSHostRequestSpacing & { pattern: RegExp })[] = [
  {
    key: 'wavlake.com',
    pattern: /^https?:\/\/(www\.)?wavlake\.com/,
    spacingMs: DEFAULT_HTTP_TIMEOUT_MS,
  },
];

/** The spacing a feed request to `url` needs, or null when its host has no rule. */
export const resolveAddByRSSHostRequestSpacing = (
  url: string
): AddByRSSHostRequestSpacing | null => {
  const rule = HOST_REQUEST_SPACING_RULES.find(({ pattern }) => pattern.test(url));
  return rule === undefined ? null : { key: rule.key, spacingMs: rule.spacingMs };
};

export const DEFAULT_MAX_FEED_BODY_BYTES = 20 * 1024 * 1024;
export const PARSER_MAX_FEED_BODY_BYTES_MIN = 1000;
export const PARSER_MAX_FEED_BODY_BYTES_MAX = 50_000_000;

/**
 * Parse optional PARSER_MAX_FEED_BODY_BYTES-like values.
 * - null/undefined/empty => null (caller should apply default)
 * - otherwise => integer in [1000, 50000000]
 */
export function parseOptionalParserMaxFeedBodyBytes(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) {
    return null;
  }

  const normalized = String(raw).trim();
  if (normalized === '') {
    return null;
  }

  const n = Number.parseInt(normalized, 10);
  if (
    !Number.isFinite(n) ||
    !Number.isInteger(n) ||
    n < PARSER_MAX_FEED_BODY_BYTES_MIN ||
    n > PARSER_MAX_FEED_BODY_BYTES_MAX
  ) {
    throw new Error(
      `PARSER_MAX_FEED_BODY_BYTES must be an integer between ${PARSER_MAX_FEED_BODY_BYTES_MIN} and ${PARSER_MAX_FEED_BODY_BYTES_MAX} when set`
    );
  }

  return n;
}

export function resolveParserMaxFeedBodyBytes(raw: string | undefined | null): number {
  return parseOptionalParserMaxFeedBodyBytes(raw) ?? DEFAULT_MAX_FEED_BODY_BYTES;
}

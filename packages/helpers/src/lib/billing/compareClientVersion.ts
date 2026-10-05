const VERSION_SEGMENT = /^\d+$/;

/**
 * Parses a plain dotted version (`5.5.3`) into its numeric segments. Returns null for anything
 * else — empty, `unknown`, prerelease or build suffixes, or non-numeric segments.
 */
export function parseClientVersion(value: string | null | undefined): readonly number[] | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }

  const segments: number[] = [];
  for (const part of trimmed.split('.')) {
    if (!VERSION_SEGMENT.test(part)) {
      return null;
    }
    const segment = Number(part);
    if (!Number.isSafeInteger(segment)) {
      return null;
    }
    segments.push(segment);
  }
  return segments;
}

/**
 * Compares a client's `X-Podverse-Client-Version` against a required minimum, segment by segment
 * and numerically (`5.10.0` is newer than `5.9.9`). Missing trailing segments count as zero, so
 * `5.5` equals `5.5.0`.
 *
 * A client version that does not parse compares as older (`-1`), so an unidentified client is told
 * to update rather than let through. A required version that does not parse is a configuration
 * error and throws.
 */
export function compareClientVersion(
  clientVersion: string | null | undefined,
  requiredVersion: string
): -1 | 0 | 1 {
  const required = parseClientVersion(requiredVersion);
  if (required === null) {
    throw new TypeError(`Required client version "${requiredVersion}" is not a dotted version`);
  }

  const client = parseClientVersion(clientVersion);
  if (client === null) {
    return -1;
  }

  const length = Math.max(client.length, required.length);
  for (let index = 0; index < length; index += 1) {
    const clientSegment = client[index] ?? 0;
    const requiredSegment = required[index] ?? 0;
    if (clientSegment > requiredSegment) {
      return 1;
    }
    if (clientSegment < requiredSegment) {
      return -1;
    }
  }
  return 0;
}

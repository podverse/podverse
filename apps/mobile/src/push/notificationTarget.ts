const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const HOME_FALLBACK_PATH = '/home';

/** Resource types with a flat content path the 452 map understands (`/<type>/<id_text>`). */
export const ROUTABLE_TARGET_TYPES = new Set([
  'album',
  'artist',
  'clip',
  'episode',
  'playlist',
  'podcast',
  'profile',
  'track',
]);

/**
 * Extract a routable path/URL from a notification data payload. Returns `null` when there is no
 * usable target so callers can decide whether to fall back to Home.
 */
export const extractNotificationTargetPath = (
  data: Record<string, unknown> | null | undefined
): string | null => {
  if (data === null || data === undefined) {
    return null;
  }

  const url = asNonEmptyString(data.url);
  if (url !== null) {
    return url;
  }

  const linkPath = asNonEmptyString(data.link_path);
  if (linkPath !== null) {
    return linkPath;
  }

  const type = asNonEmptyString(data.type);
  const idText = asNonEmptyString(data.id_text);
  if (type !== null && idText !== null && ROUTABLE_TARGET_TYPES.has(type)) {
    return `/${type}/${idText}`;
  }

  return null;
};

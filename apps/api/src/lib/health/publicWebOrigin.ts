/**
 * Public website origin from `WEB_PROTOCOL` and `WEB_DOMAIN`.
 * Null when the pair is not an http or https origin with an empty path.
 * A null result does not mean the process is down.
 */
export const publicWebOriginFromConfig = (
  protocol: string | undefined,
  domain: string | undefined
): string | null => {
  if (protocol === undefined || domain === undefined) {
    return null;
  }

  const scheme = protocol.trim().replace(/:$/, '');
  const host = domain.trim().replace(/\/+$/, '');
  if (scheme === '' || host === '') {
    return null;
  }

  return normalizePublicWebOrigin(`${scheme}://${host}`);
};

/** `http(s)` origin with no userinfo, query, hash, or path. Trailing slash is dropped. */
export const normalizePublicWebOrigin = (raw: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return null;
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    return null;
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    return null;
  }

  return parsed.origin;
};

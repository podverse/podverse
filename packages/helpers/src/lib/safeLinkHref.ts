/**
 * Normalizes caller-provided link targets for safe use in anchors / Next Link.
 *
 * Allowed:
 * - Same-site paths: `/…` (never `//…`, which is treated as unsafe protocol-relative).
 * - Same-document relative: `?query`, `#fragment`, or path segments without a scheme (e.g. `a/b`).
 * - External / special: `http`, `https`, `mailto`, `tel` only.
 *
 * Rejected: `javascript:`, `data:`, `file:`, unknown schemes, and malformed URLs.
 */
export function getSafeLinkHref(raw: string): string | undefined {
  const href = raw.trim();
  if (href === '') {
    return undefined;
  }

  // Protocol-relative URLs (`//evil.com`) must not be treated as internal paths.
  if (href.startsWith('//')) {
    return undefined;
  }

  // Internal absolute path or search/hash-only relative navigations.
  if (href.startsWith('/') || href.startsWith('?') || href.startsWith('#')) {
    return href;
  }

  const colonIdx = href.indexOf(':');
  if (colonIdx === 0) {
    return undefined;
  }

  // Path-like strings without a scheme (no ":" before path content).
  if (colonIdx === -1) {
    return href.includes(':') ? undefined : href;
  }

  const schemeRaw = href.slice(0, colonIdx);
  const normalizedScheme = schemeRaw.replace(/\s+/g, '').toLowerCase();

  const BLOCKED_SCHEMES = new Set([
    'about',
    'blob',
    'chrome',
    'chrome-extension',
    'data',
    'file',
    'ftp',
    'javascript',
    'vbscript',
  ]);

  if (BLOCKED_SCHEMES.has(normalizedScheme)) {
    return undefined;
  }

  const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
  if (!ALLOWED_SCHEMES.has(normalizedScheme)) {
    return undefined;
  }

  try {
    if (normalizedScheme === 'http' || normalizedScheme === 'https') {
      const u = new URL(href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return undefined;
      }
    }
    return href;
  } catch {
    return undefined;
  }
}

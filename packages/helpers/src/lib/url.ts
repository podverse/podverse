/**
 * Remove any query parameter whose key (or key=value pair) matches the provided pattern.
 * The path may be a full URL (with protocol) or just a relative/root path.
 *
 * Pattern matching rules:
 * - Exact match against the param key (e.g. pattern = "utm_source")
 * - Exact match against the full key=value pair (e.g. pattern = "utm_source=twitter")
 * - If the pattern contains regex metacharacters, it is treated as a RegExp and tested
 *   against both the key and the key=value pair.
 */
export function removeQueryParamByPattern(path: string, pattern: string): string {
  if (!path) {return path;}

  const isFullUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path);
  // Use a dummy base for relative paths so URL parsing works.
  const url = new URL(path, isFullUrl ? undefined : 'http://dummy.local');

  const isRegex = /[.*+?^${}()|[\]\\]/.test(pattern);
  let regex: RegExp | null = null;
  if (isRegex) {
    try {
      regex = new RegExp(pattern);
    } catch {
      regex = null; // Fallback to non-regex matching if invalid
    }
  }

  const toDelete: string[] = [];
  url.searchParams.forEach((value, key) => {
    const pair = `${key}=${value}`;
    const matches =
      (regex && (regex.test(key) || regex.test(pair))) ||
      key === pattern ||
      pair === pattern;
    if (matches) {
      toDelete.push(key);
    }
  });

  toDelete.forEach((k) => url.searchParams.delete(k));

  // Reconstruct result preserving hash and path, removing dummy origin for relative paths.
  const search = url.searchParams.toString();
  const queryPrefix = search ? `?${search}` : '';
  const hash = url.hash || '';
  if (isFullUrl) {
    return `${url.origin}${url.pathname}${queryPrefix}${hash}`;
  }
  // Relative: strip dummy origin.
  return `${url.pathname}${queryPrefix}${hash}`;
}

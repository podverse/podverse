const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Allowed values for NEXT_PUBLIC_CUSTOM_THEMES_URL: https anywhere, or http on localhost/127.0.0.1 only.
 */
export function isAllowedCustomThemesUrl(value: string | undefined): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol === 'https:') {
      return true;
    }
    return parsedUrl.protocol === 'http:' && LOCAL_HTTP_HOSTS.has(parsedUrl.hostname);
  } catch {
    return false;
  }
}

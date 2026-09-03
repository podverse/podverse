import { ONE_YEAR_SECONDS } from '@podverse/helpers';

/**
 * Reading and writing `document.cookie` for preferences the server has to know about at render time
 * — theme and locale, which decide the first paint and so cannot wait for client JavaScript.
 *
 * Every function is a no-op (or `undefined`) when `document` is absent, so callers can run them
 * during server rendering without guarding each site.
 */

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const parts = document.cookie.split(/;\s*/);
  for (const part of parts) {
    const [key, ...valParts] = part.split('=');
    if (key === name) {
      return valParts.join('=');
    }
  }
  return undefined;
}

export function writeCookie(name: string, value: string, maxAgeSeconds = ONE_YEAR_SECONDS) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
}

export function clearCookie(name: string) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; path=/; max-age=0`;
}

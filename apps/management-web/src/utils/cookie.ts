/** Mirrors `apps/web/src/utils/cookie.ts` so theme persistence matches web cookie semantics. */

export function writeCookie(name: string, value: string, maxAgeSeconds = 31536000) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
}

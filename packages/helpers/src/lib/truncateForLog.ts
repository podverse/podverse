/**
 * Trims and truncates a nullable string for safe logging (avoids huge header/url blobs).
 * Empty after trim → null. Ellipsis is a single Unicode character (…).
 */
export function truncateForLog(value: string | null, maxChars: number): string | null {
  if (value === null) {
    return null;
  }
  const t = value.trim();
  if (t === '') {
    return null;
  }
  return t.length > maxChars ? `${t.slice(0, maxChars)}…` : t;
}

/**
 * Parse an arbitrary value into a finite, non-negative seconds count.
 *
 * The helper accepts only finite, non-negative numbers and numeric strings:
 *
 * - `null`, `undefined`, empty string, non-numeric string, `NaN`,
 *   `Infinity`, `-Infinity`, and any non-string-non-number value all
 *   resolve to `undefined`.
 * - Finite negative numbers (or negative numeric strings) resolve to
 *   `undefined`.
 *
 * Consumers compose with `parsePlaybackSeconds(value) ?? 0` to preserve
 * the "fall back to zero" behavior at the call site while keeping the
 * helper output narrow and total.
 *
 */
export function parsePlaybackSeconds(value: unknown): number | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return value;
  }

  if (typeof value === 'string') {
    if (value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }
    return parsed;
  }

  return undefined;
}

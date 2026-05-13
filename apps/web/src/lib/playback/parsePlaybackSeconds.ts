/**
 * Parse an arbitrary value into a finite, non-negative seconds count.
 *
 * This is the Phase 2 replacement for the inline `Number(value) || 0`
 * pattern used in `useMediaPlayerResourceUpdate.getAbridgedAndSet` and
 * scattered throughout snapshot/queue/abridged consumers. Compared to
 * the inline pattern, this helper **tightens** the contract:
 *
 * - `null`, `undefined`, empty string, non-numeric string, `NaN`,
 *   `Infinity`, `-Infinity`, and any non-string-non-number value all
 *   resolve to `undefined`.
 * - Finite negative numbers (or negative numeric strings) also resolve
 *   to `undefined`. Today's `Number(p) || 0` quietly passes negatives
 *   through (e.g. `-5 || 0 === -5`); the new contract treats negatives
 *   as missing input.
 *
 * Consumers compose with `parsePlaybackSeconds(value) ?? 0` to preserve
 * the "fall back to zero" behavior at the call site while keeping the
 * helper output narrow and total.
 *
 * See MEDIA-PLAYER-DECISION-MATRIX.md § "Sign and validity rules" for
 * the documented behavior contract.
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

export type ImageRowLike = { is_resized?: boolean; url: string };

/**
 * Pass to BaseManyService._update as `existingEntity`:
 * - Returns `persistedRow` for any resized row so the existing CDN row rotates in place
 *   to the new URL/checksum (no stale rows when source content changes).
 * - Returns `undefined` for non-resized (source) rows so `_update` inserts a new resized row
 *   alongside the source instead of mutating it.
 *
 * Safe because `loadPersistedImage` only returns a resized row when
 * `findResizedByShrinkKeyPrefix` already matched the same `(parent.id, urlHash, widthPx)`
 * family for this shrink target.
 */
export function existingEntityForResizedSave<T extends ImageRowLike>(
  persistedRow: T
): T | undefined {
  return persistedRow.is_resized === true ? persistedRow : undefined;
}

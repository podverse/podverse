/**
 * Coerce a DTO / queue duration or position string into a positive finite seconds value.
 * Returns `0` when the value is missing, non-numeric, or non-positive.
 */
export const parsePlaybackSeconds = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
};

/**
 * Prefer an explicit duration hint (snapshot restore, caller override). Otherwise use the item's
 * RSS / itunes duration so the scrubber can seek and show clocks before native metadata arrives.
 * Native progress with `durationSeconds > 0` still overwrites the store.
 */
export const resolveMediaFileDurationHintSeconds = (
  override: number | undefined,
  itemDuration: string | number | null | undefined
): number | undefined => {
  if (override !== undefined && override > 0) {
    return override;
  }
  const parsed = parsePlaybackSeconds(itemDuration);
  return parsed > 0 ? parsed : undefined;
};

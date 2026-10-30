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
 * A native sample with a known length still overwrites the store; a livestream never takes one.
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

/**
 * Duration the player shows when an item loads: the item's hint, or 0 when there is none. A
 * livestream has no duration, so it is always 0. Every load replaces the previous item's value.
 */
export const resolveLoadDurationSeconds = (params: {
  isLive: boolean;
  hintSeconds: number | undefined;
}): number => {
  if (params.isLive) {
    return 0;
  }
  const hint = params.hintSeconds;
  return hint !== undefined && Number.isFinite(hint) && hint > 0 ? hint : 0;
};

/**
 * Duration a native sample sets. `null` keeps the stored value (the engine does not know the
 * length yet). A livestream is always 0, whatever the engine reports.
 */
export const resolveSampleDurationSeconds = (params: {
  isLive: boolean;
  sampleSeconds: number;
}): number | null => {
  if (params.isLive) {
    return 0;
  }
  return Number.isFinite(params.sampleSeconds) && params.sampleSeconds > 0
    ? params.sampleSeconds
    : null;
};

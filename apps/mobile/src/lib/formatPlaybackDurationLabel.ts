import { formatCompactPlaybackDurationFromSeconds } from '@podverse/helpers/timeFormatter';

type TranslateDuration = (key: string, options: { count: number }) => string;

/**
 * Play-row duration from a second count, using catalog short units (`info.time.hr` / `info.time.min`).
 * Returns `null` when there is no duration to show.
 */
export const formatPlaybackDurationLabel = (
  seconds: number,
  translate: TranslateDuration
): string | null => {
  return formatCompactPlaybackDurationFromSeconds(seconds, (unit, count) =>
    translate(unit === 'hour' ? 'info.time.hr' : 'info.time.min', { count })
  );
};

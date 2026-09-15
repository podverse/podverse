export type CompactPlaybackDuration = {
  hours: number;
  minutes: number;
};

export type CompactPlaybackDurationUnit = 'hour' | 'minute';

/**
 * Hours and minutes for a play-row time label. Seconds are never a display unit: any leftover
 * greater than 0 rounds up to the next minute. `null` means there is no duration to show.
 */
export function toCompactPlaybackDuration(seconds: number): CompactPlaybackDuration | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const totalMinutes = Math.ceil(seconds / 60);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function formatCompactPlaybackDuration(
  parts: CompactPlaybackDuration,
  formatUnit: (unit: CompactPlaybackDurationUnit, count: number) => string
): string {
  const minutesLabel = formatUnit('minute', parts.minutes);
  if (parts.hours > 0) {
    return `${formatUnit('hour', parts.hours)} ${minutesLabel}`;
  }
  return minutesLabel;
}

export function formatCompactPlaybackDurationFromSeconds(
  seconds: number,
  formatUnit: (unit: CompactPlaybackDurationUnit, count: number) => string
): string | null {
  const parts = toCompactPlaybackDuration(seconds);
  if (parts === null) {
    return null;
  }
  return formatCompactPlaybackDuration(parts, formatUnit);
}

const ENGLISH_SHORT_UNITS: Record<CompactPlaybackDurationUnit, (count: number) => string> = {
  hour: (count) => `${count} hr`,
  minute: (count) => `${count} min`,
};

/**
 * Play-row duration in English short units (`1 hr 33 min`, `1 min`). Prefer
 * `formatCompactPlaybackDurationFromSeconds` with catalog `info.time.hr` / `info.time.min` at app
 * call sites so locales do not inherit English abbreviations.
 */
export function formatSecondsToReadableDuration(input: string, _lang: string = 'en-US'): string {
  let seconds = Math.floor(parseFloat(input));
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }

  return (
    formatCompactPlaybackDurationFromSeconds(seconds, (unit, count) =>
      ENGLISH_SHORT_UNITS[unit](count)
    ) ?? ''
  );
}

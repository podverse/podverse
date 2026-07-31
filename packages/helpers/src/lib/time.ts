export const TIME_CONSTANTS = {
  ONE_DAY_IN_MINUTES: 1440,
  ONE_WEEK_IN_MINUTES: 10080,
  ONE_MONTH_IN_MINUTES: 43200,
};

/** Default retention for raw stats track events before prune (see STATS_TRACK_EVENT_RETENTION_DAYS). */
export const DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS = 30;

export function formatHHMMSS(sec: number) {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNumericToHHMMSS(sec: string): string {
  const totalSeconds = Math.floor(parseFloat(sec));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export type FormatClockOptions = {
  fallback?: string;
};

/** Format seconds as a zero-padded player clock (`MM:SS`). */
export function formatClock(
  seconds: number | null | undefined,
  options?: FormatClockOptions
): string {
  const fallback = options?.fallback ?? '00:00';
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return fallback;
  }

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
}

/** Format string-encoded seconds as a zero-padded `MM:SS` or `HH:MM:SS` player clock. */
export function formatPlaybackTime(rawValue: string | null | undefined): string {
  if (!rawValue) {
    return '00:00';
  }

  const seconds = Math.floor(Number.parseFloat(rawValue));
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatInputToHHMMSS(input: string): string {
  const sanitized = input.replace(/[^0-9:]/g, '');
  const digits = sanitized.replace(/:/g, '');

  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    const minutes = digits.slice(0, digits.length - 2);
    const seconds = digits.slice(-2);
    return `${minutes}:${seconds}`;
  }

  const hours = digits.slice(0, digits.length - 4);
  const minutes = digits.slice(-4, -2);
  const seconds = digits.slice(-2);

  return `${hours}:${minutes}:${seconds}`;
}

export function hhmmssToSecondsNumeric(time: string): string {
  if (!time) {
    return '0.00';
  }
  const parts = time.split(':').map(Number).reverse();
  let seconds = 0;
  if (parts.length > 0 && parts[0] !== undefined) {
    seconds += parts[0];
  }
  if (parts.length > 1 && parts[1] !== undefined) {
    seconds += parts[1] * 60;
  }
  if (parts.length > 2 && parts[2] !== undefined) {
    seconds += parts[2] * 3600;
  }
  return `${seconds.toFixed(2)}`;
}

export function hhmmssToSecondsNumber(time: string): number {
  if (!time) {
    return 0.0;
  }
  const parts = time.split(':').map(Number).reverse();
  let seconds = 0;
  if (parts.length > 0 && parts[0] !== undefined) {
    seconds += parts[0];
  }
  if (parts.length > 1 && parts[1] !== undefined) {
    seconds += parts[1] * 60;
  }
  if (parts.length > 2 && parts[2] !== undefined) {
    seconds += parts[2] * 3600;
  }
  return Number(seconds.toFixed(2));
}

export type TimeRemaining = {
  daysLeft: number | null;
  hoursLeft: number | null;
  minutesLeft: number | null;
};

/**
 * Calculates the time remaining until an expiration date.
 * Returns an object with days, hours, or minutes left based on the remaining time:
 * - If less than 1 hour: sets minutes only
 * - If less than 24 hours: sets hours only
 * - If 24 hours or more: sets days only
 *
 * @param expirationDate - The expiration date as a Date object or ISO string
 * @returns Object with daysLeft, hoursLeft, and minutesLeft
 */
export function calculateTimeRemaining(
  expirationDate: Date | string | null | undefined
): TimeRemaining {
  const result: TimeRemaining = {
    daysLeft: null,
    hoursLeft: null,
    minutesLeft: null,
  };

  if (!expirationDate) {
    return result;
  }

  const expiration = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = new Date();
  const diffTime = Math.max(0, expiration.getTime() - now.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  const diffHoursRounded = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffHours < 1) {
    // Less than an hour left - show minutes
    result.minutesLeft = diffMinutes;
  } else if (diffHours < 24) {
    // Less than a day but at least an hour - show hours
    result.hoursLeft = diffHoursRounded;
  } else {
    // At least a day left - show days
    result.daysLeft = diffDays;
  }

  return result;
}

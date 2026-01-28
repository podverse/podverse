import { formatDuration, intervalToDuration } from 'date-fns';
import { enUS, es, el } from 'date-fns/locale';

export function formatSecondsToReadableDuration(input: string, lang: string = 'en-US'): string {
  let seconds = Math.floor(parseFloat(input));
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }
  let duration = intervalToDuration({ start: 0, end: seconds * 1000 });

  if (
    !duration.years &&
    !duration.months &&
    !duration.days &&
    !duration.hours &&
    !duration.minutes &&
    !duration.seconds
  ) {
    duration = { ...duration, seconds: 0 };
  }

  let locale;
  switch (lang) {
    case 'es':
      locale = es;
      break;
    case 'el':
    case 'el-GR':
      locale = el;
      break;
    case 'en-US':
    default:
      locale = enUS;
      break;
  }

  // If under 60 seconds, only show seconds
  if (seconds < 60) {
    return formatDuration(duration, {
      format: ['seconds'],
      locale,
      zero: true,
    });
  }

  // Otherwise, show hours and minutes
  return formatDuration(duration, {
    format: ['hours', 'minutes'],
    locale,
    zero: true,
  });
}

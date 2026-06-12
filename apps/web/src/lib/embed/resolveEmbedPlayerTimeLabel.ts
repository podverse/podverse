import { formatHHMMSS } from '@podverse/helpers';

export const EMBED_PLAYER_UNKNOWN_TIME_DISPLAY = '--:--';

export function resolveEmbedPlayerTimeLabel(currentTime: number, duration: number): string {
  if (currentTime > 0) {
    return formatHHMMSS(currentTime);
  }

  if (duration > 0) {
    return formatHHMMSS(duration);
  }

  return EMBED_PLAYER_UNKNOWN_TIME_DISPLAY;
}

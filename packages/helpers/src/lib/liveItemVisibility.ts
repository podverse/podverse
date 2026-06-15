import { LiveItemStatusEnum } from '../dtos/liveItem/liveItem.js';

// Ended livestreams (live items) older than this are hidden from list endpoints.
// Hardcoded by product decision (no env); detail endpoints stay unfiltered.
export const LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function getEndedLiveItemVisibilityCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS);
}

export interface LiveItemEndedStaleInput {
  live_item_status_id: LiveItemStatusEnum;
  start_time: string | Date;
  end_time?: string | Date | null;
}

function toTime(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function isLiveItemEndedAndStale(
  liveItem: LiveItemEndedStaleInput,
  now: Date = new Date()
): boolean {
  if (liveItem.live_item_status_id !== LiveItemStatusEnum.Ended) {
    return false;
  }

  const cutoff = getEndedLiveItemVisibilityCutoff(now).getTime();
  const reference =
    liveItem.end_time !== null && liveItem.end_time !== undefined
      ? liveItem.end_time
      : liveItem.start_time;

  return toTime(reference) < cutoff;
}

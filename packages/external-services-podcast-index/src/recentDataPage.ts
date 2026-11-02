/** One updated feed from a Podcast Index `/recent/data` page (`data.feeds[]`). */
export type RecentDataFeed = {
  feedId: number;
  feedUrl: string;
};

/**
 * One `/recent/data` response. `nextSince` (Unix seconds) is where the following page starts and
 * is null when the response carries none; `position` is the response's `data.position`.
 */
export type RecentDataPage = {
  since: number;
  feeds: RecentDataFeed[];
  nextSince: number | null;
  position: number | null;
};

/** Why `recentGetData` stopped yielding pages. */
export type RecentGetDataStopReason = 'caught_up' | 'time_cap';

export function parseRecentDataPage(response: unknown, since: number): RecentDataPage | null {
  if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.feeds)) {
    return null;
  }

  const feeds: RecentDataFeed[] = [];
  for (const entry of response.data.feeds) {
    if (!isRecord(entry) || typeof entry.feedUrl !== 'string' || entry.feedUrl === '') {
      continue;
    }
    const feedId = positiveInteger(entry.feedId);
    if (feedId === null) {
      continue;
    }
    feeds.push({ feedId, feedUrl: entry.feedUrl });
  }

  return {
    since,
    feeds,
    nextSince: positiveInteger(response.nextSince),
    position: positiveInteger(response.data.position),
  };
}

function positiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

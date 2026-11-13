import type {
  DirectoryExportEntry,
  DirectoryFeedUrlLookup,
} from '../../data/repositories/subscriptionsRepository';

/** Calls in flight at once. Small, so a large library never bursts the API. */
export const DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY = 4;
/** A 429 asking for a longer wait than this ends the run; the rest are left out. */
export const DIRECTORY_FEED_URL_RATE_LIMIT_MAX_WAIT_MS = 60_000;
/** Progress reaches the UI at most this often, and always on the last lookup. */
export const DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS = 500;

export type DirectoryFeedUrlLookupResult = {
  /** Found feeds in the order of `entries`. */
  found: { feedUrl: string; title: string | null }[];
  missingCount: number;
};

type FoundFeed = DirectoryFeedUrlLookupResult['found'][number];

/**
 * Look up the feed URL of every directory follow, a few at a time. A 429 pauses every worker
 * once per entry; an unreachable answer, a second 429, or a wait over the maximum ends the run,
 * and every entry without an answer counts as left out. Null when `signal` aborts.
 */
export const lookupDirectoryFeedUrls = async (params: {
  entries: readonly DirectoryExportEntry[];
  lookup: (idText: string) => Promise<DirectoryFeedUrlLookup>;
  now: () => number;
  onProgress: (done: number, total: number) => void;
  signal: AbortSignal;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
}): Promise<DirectoryFeedUrlLookupResult | null> => {
  const { entries, lookup, now, onProgress, signal, sleep } = params;
  if (signal.aborted) {
    return null;
  }
  const total = entries.length;
  if (total === 0) {
    return { found: [], missingCount: 0 };
  }

  /** `null` is a final "left out"; `undefined` has no outcome yet. */
  const outcomes: (FoundFeed | null | undefined)[] = new Array<FoundFeed | null | undefined>(total);
  const retried = new Set<number>();
  const retryQueue: number[] = [];
  let nextIndex = 0;
  let stopped = false;
  let pausedUntilMs = 0;
  let done = 0;
  let lastProgressMs = now();
  let reportedFinal = false;

  const reportProgress = (): void => {
    if (reportedFinal) {
      return;
    }
    if (done === total) {
      reportedFinal = true;
      onProgress(total, total);
      return;
    }
    const currentMs = now();
    if (currentMs - lastProgressMs >= DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS) {
      lastProgressMs = currentMs;
      onProgress(done, total);
    }
  };

  const settle = (index: number, outcome: FoundFeed | null): void => {
    if (outcomes[index] !== undefined) {
      return;
    }
    outcomes[index] = outcome;
    done += 1;
    reportProgress();
  };

  const takeIndex = (): number | undefined => {
    const retryIndex = retryQueue.shift();
    if (retryIndex !== undefined) {
      return retryIndex;
    }
    if (nextIndex < total) {
      const index = nextIndex;
      nextIndex += 1;
      return index;
    }
    return undefined;
  };

  const worker = async (): Promise<void> => {
    for (;;) {
      if (signal.aborted || stopped) {
        return;
      }
      const waitMs = pausedUntilMs - now();
      if (waitMs > 0) {
        await sleep(waitMs, signal);
        continue;
      }
      const index = takeIndex();
      if (index === undefined) {
        return;
      }
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }

      let result: DirectoryFeedUrlLookup;
      try {
        result = await lookup(entry.idText);
      } catch {
        result = { kind: 'missing' };
      }
      if (signal.aborted) {
        return;
      }

      switch (result.kind) {
        case 'found':
          settle(index, { feedUrl: result.feedUrl, title: result.title ?? entry.title });
          break;
        case 'missing':
          settle(index, null);
          break;
        case 'rate_limited':
          if (
            !stopped &&
            !retried.has(index) &&
            result.retryAfterMs <= DIRECTORY_FEED_URL_RATE_LIMIT_MAX_WAIT_MS
          ) {
            retried.add(index);
            pausedUntilMs = Math.max(pausedUntilMs, now() + result.retryAfterMs);
            retryQueue.push(index);
          } else {
            stopped = true;
          }
          break;
        case 'unreachable':
          stopped = true;
          break;
      }
    }
  };

  onProgress(0, total);
  const workerCount = Math.min(DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (signal.aborted) {
    return null;
  }

  const found: FoundFeed[] = [];
  for (let index = 0; index < total; index += 1) {
    const outcome = outcomes[index];
    if (outcome !== undefined && outcome !== null) {
      found.push(outcome);
    }
  }
  done = total;
  reportProgress();
  return { found, missingCount: total - found.length };
};

export const sleepUnlessAborted = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish);
  });

import { describe, expect, it } from 'vitest';

import type {
  DirectoryExportEntry,
  DirectoryFeedUrlLookup,
} from '../../data/repositories/subscriptionsRepository';
import {
  DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY,
  DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS,
  lookupDirectoryFeedUrls,
} from './directoryFeedUrlLookup';

const entriesOf = (count: number): DirectoryExportEntry[] =>
  Array.from({ length: count }, (_, index) => ({ idText: `id-${index}`, title: `Show ${index}` }));

const feedUrlFor = (idText: string): string => `https://example.com/${idText}.xml`;

const foundFor = (idText: string): DirectoryFeedUrlLookup => ({
  feedUrl: feedUrlFor(idText),
  kind: 'found',
  title: `Remote ${idText}`,
});

const createHarness = () => {
  let clockMs = 0;
  const sleeps: number[] = [];
  const progress: { done: number; total: number; atMs: number }[] = [];
  const calls: string[] = [];
  return {
    calls,
    now: () => clockMs,
    advance: (ms: number) => {
      clockMs += ms;
    },
    onProgress: (done: number, total: number) => {
      progress.push({ atMs: clockMs, done, total });
    },
    progress,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clockMs += ms;
    },
    sleeps,
  };
};

describe('lookupDirectoryFeedUrls', () => {
  it('keeps found feeds in entry order when lookups answer out of order', async () => {
    const harness = createHarness();
    const resolvers = new Map<string, () => void>();
    const pending = lookupDirectoryFeedUrls({
      entries: entriesOf(4),
      lookup: (idText) =>
        new Promise<DirectoryFeedUrlLookup>((resolve) => {
          resolvers.set(idText, () => resolve(foundFor(idText)));
        }),
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    for (const idText of ['id-3', 'id-2', 'id-1', 'id-0']) {
      resolvers.get(idText)?.();
      await Promise.resolve();
    }

    const result = await pending;
    expect(result?.found.map((feed) => feed.feedUrl)).toEqual([
      feedUrlFor('id-0'),
      feedUrlFor('id-1'),
      feedUrlFor('id-2'),
      feedUrlFor('id-3'),
    ]);
    expect(result?.missingCount).toBe(0);
  });

  it('leaves out a missing feed and falls back to the local title when the route has none', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(2),
      lookup: async (idText) =>
        idText === 'id-0'
          ? { kind: 'missing' }
          : { feedUrl: feedUrlFor(idText), kind: 'found', title: null },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(result).toEqual({
      found: [{ feedUrl: feedUrlFor('id-1'), title: 'Show 1' }],
      missingCount: 1,
    });
  });

  it('never has more than four lookups in flight', async () => {
    const harness = createHarness();
    let inFlight = 0;
    let maxInFlight = 0;
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(10),
      lookup: async (idText) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(maxInFlight).toBe(DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY);
    expect(result?.found).toHaveLength(10);
  });

  it('waits out one 429 and retries that entry once', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(2),
      lookup: async (idText) => {
        harness.calls.push(idText);
        const firstCall = harness.calls.filter((call) => call === idText).length === 1;
        if (idText === 'id-0' && firstCall) {
          return { kind: 'rate_limited', retryAfterMs: 5000 };
        }
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(harness.sleeps[0]).toBe(5000);
    expect(harness.calls.filter((call) => call === 'id-0')).toHaveLength(2);
    expect(result?.found.map((feed) => feed.feedUrl)).toEqual([
      feedUrlFor('id-0'),
      feedUrlFor('id-1'),
    ]);
    expect(result?.missingCount).toBe(0);
  });

  it('stops when the same entry is rate limited twice and leaves out every entry without an answer', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(10),
      lookup: async (idText) => {
        harness.calls.push(idText);
        if (idText === 'id-0') {
          return { kind: 'rate_limited', retryAfterMs: 5000 };
        }
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    const calledIdTexts = new Set(harness.calls);
    expect(harness.calls.filter((call) => call === 'id-0')).toHaveLength(2);
    expect(calledIdTexts.size).toBeLessThan(10);
    expect(result?.found.map((feed) => feed.feedUrl)).toEqual(
      [...calledIdTexts]
        .filter((idText) => idText !== 'id-0')
        .sort()
        .map(feedUrlFor)
    );
    expect(result?.missingCount).toBe(10 - (result?.found.length ?? 0));
  });

  it('stops when a 429 asks for a wait over the maximum', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(10),
      lookup: async (idText) => {
        harness.calls.push(idText);
        if (idText === 'id-0') {
          return { kind: 'rate_limited', retryAfterMs: 60_001 };
        }
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(harness.sleeps).toEqual([]);
    expect(harness.calls).toHaveLength(DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY);
    expect(result?.found).toHaveLength(3);
    expect(result?.missingCount).toBe(7);
  });

  it('starts no new lookup after an unreachable answer and leaves out the rest', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: entriesOf(10),
      lookup: async (idText) => {
        harness.calls.push(idText);
        if (idText === 'id-1') {
          return { kind: 'unreachable' };
        }
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(harness.calls).toEqual(['id-0', 'id-1', 'id-2', 'id-3']);
    expect(result?.found.map((feed) => feed.feedUrl)).toEqual([
      feedUrlFor('id-0'),
      feedUrlFor('id-2'),
      feedUrlFor('id-3'),
    ]);
    expect(result?.missingCount).toBe(7);
  });

  it('returns null when the signal aborts', async () => {
    const harness = createHarness();
    const preAborted = new AbortController();
    preAborted.abort();
    expect(
      await lookupDirectoryFeedUrls({
        entries: entriesOf(3),
        lookup: async (idText) => foundFor(idText),
        now: harness.now,
        onProgress: harness.onProgress,
        signal: preAborted.signal,
        sleep: harness.sleep,
      })
    ).toBeNull();

    const midRun = new AbortController();
    expect(
      await lookupDirectoryFeedUrls({
        entries: entriesOf(6),
        lookup: async (idText) => {
          if (idText === 'id-1') {
            midRun.abort();
          }
          return foundFor(idText);
        },
        now: harness.now,
        onProgress: harness.onProgress,
        signal: midRun.signal,
        sleep: harness.sleep,
      })
    ).toBeNull();
  });

  it('answers an empty list without reporting progress', async () => {
    const harness = createHarness();
    const result = await lookupDirectoryFeedUrls({
      entries: [],
      lookup: async (idText) => foundFor(idText),
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    expect(result).toEqual({ found: [], missingCount: 0 });
    expect(harness.progress).toEqual([]);
  });

  it('reports progress from zero, at most once per interval, and once at the end', async () => {
    const harness = createHarness();
    await lookupDirectoryFeedUrls({
      entries: entriesOf(10),
      lookup: async (idText) => {
        harness.advance(200);
        return foundFor(idText);
      },
      now: harness.now,
      onProgress: harness.onProgress,
      signal: new AbortController().signal,
      sleep: harness.sleep,
    });

    const { progress } = harness;
    expect(progress[0]).toMatchObject({ done: 0, total: 10 });
    expect(progress[progress.length - 1]).toMatchObject({ done: 10, total: 10 });
    expect(progress.filter((call) => call.done === 10)).toHaveLength(1);
    for (let index = 1; index < progress.length - 1; index += 1) {
      const current = progress[index];
      const previous = progress[index - 1];
      if (current !== undefined && previous !== undefined) {
        expect(current.atMs - previous.atMs).toBeGreaterThanOrEqual(
          DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS
        );
      }
    }
  });
});

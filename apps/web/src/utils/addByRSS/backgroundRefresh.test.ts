import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  applyAddByRSSParseStatusMock,
  enqueueAddByRSSFirstParsesMock,
  getAllAddByRSSFeedsMock,
  runAddByRSSParseAllMock,
  syncAddByRSSFollowStubsMock,
} = vi.hoisted(() => ({
  applyAddByRSSParseStatusMock: vi.fn(),
  enqueueAddByRSSFirstParsesMock: vi.fn(),
  getAllAddByRSSFeedsMock: vi.fn(),
  runAddByRSSParseAllMock: vi.fn(),
  syncAddByRSSFollowStubsMock: vi.fn(),
}));

vi.mock('./actions', () => ({ applyAddByRSSParseStatus: applyAddByRSSParseStatusMock }));
vi.mock('./firstParse', () => ({ enqueueAddByRSSFirstParses: enqueueAddByRSSFirstParsesMock }));
vi.mock('./parseAll', () => ({ runAddByRSSParseAll: runAddByRSSParseAllMock }));
vi.mock('./storage', () => ({ getAllAddByRSSFeeds: getAllAddByRSSFeedsMock }));
vi.mock('./sync', () => ({ syncAddByRSSFollowStubs: syncAddByRSSFollowStubsMock }));

import type { AddByRSSBackgroundRefreshAccount } from './backgroundRefresh';
import {
  ADD_BY_RSS_BACKGROUND_REFRESH_INTERVAL_MS,
  runAddByRSSBackgroundRefresh,
} from './backgroundRefresh';
import { markAddByRSSParseInFlight, releaseAddByRSSParseInFlight } from './parseInFlight';
import type { AddByRSSFeedRecord } from './types';

const NOW_MS = Date.parse('2026-01-01T12:00:00.000Z');

const member = (idText: string): AddByRSSBackgroundRefreshAccount => ({
  id_text: idText,
  account_membership_status: {
    account_membership_id: 1,
    membership_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  },
});

const feed = (feedUrl: string): AddByRSSFeedRecord => ({
  id: 1,
  idText: `id-${feedUrl}`,
  resourceType: 'podcasts',
  feedUrl,
  title: feedUrl,
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('runAddByRSSBackgroundRefresh', () => {
  beforeEach(() => {
    window.localStorage.clear();
    syncAddByRSSFollowStubsMock.mockResolvedValue(undefined);
    enqueueAddByRSSFirstParsesMock.mockResolvedValue([]);
    getAllAddByRSSFeedsMock.mockResolvedValue([]);
    runAddByRSSParseAllMock.mockResolvedValue({
      requestIds: [],
      dedupedFeedUrls: [],
      dedupeTtlSeconds: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runs once per interval per account', async () => {
    await runAddByRSSBackgroundRefresh(member('account-a'), NOW_MS);
    await runAddByRSSBackgroundRefresh(member('account-a'), NOW_MS + 60_000);
    expect(syncAddByRSSFollowStubsMock).toHaveBeenCalledTimes(1);
    expect(runAddByRSSParseAllMock).toHaveBeenCalledTimes(1);

    await runAddByRSSBackgroundRefresh(member('account-b'), NOW_MS + 60_000);
    expect(syncAddByRSSFollowStubsMock).toHaveBeenCalledTimes(2);
    expect(syncAddByRSSFollowStubsMock).toHaveBeenLastCalledWith('account-b');

    await runAddByRSSBackgroundRefresh(
      member('account-a'),
      NOW_MS + ADD_BY_RSS_BACKGROUND_REFRESH_INTERVAL_MS
    );
    expect(syncAddByRSSFollowStubsMock).toHaveBeenCalledTimes(3);
  });

  it('first-parses for an account without membership but skips the full refresh', async () => {
    await runAddByRSSBackgroundRefresh({ id_text: 'free-account' }, NOW_MS);

    expect(syncAddByRSSFollowStubsMock).toHaveBeenCalledWith('free-account');
    expect(enqueueAddByRSSFirstParsesMock).toHaveBeenCalledWith({ accountId: 'free-account' });
    expect(runAddByRSSParseAllMock).not.toHaveBeenCalled();
  });

  it('sends the full refresh the feeds the first parse did not start', async () => {
    enqueueAddByRSSFirstParsesMock.mockResolvedValue(['https://example.com/new.xml']);
    getAllAddByRSSFeedsMock.mockResolvedValue([
      feed('https://example.com/new.xml'),
      feed('https://example.com/old.xml'),
    ]);

    await runAddByRSSBackgroundRefresh(member('account-c'), NOW_MS);

    expect(runAddByRSSParseAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-c',
        feeds: [expect.objectContaining({ feedUrl: 'https://example.com/old.xml' })],
      })
    );
  });

  it('leaves a feed this page is already parsing out of the refresh result', async () => {
    const addingUrl = 'https://example.com/adding.xml';
    markAddByRSSParseInFlight(addingUrl);
    getAllAddByRSSFeedsMock.mockResolvedValue([
      feed(addingUrl),
      feed('https://example.com/old.xml'),
    ]);

    try {
      await runAddByRSSBackgroundRefresh(member('account-f'), NOW_MS);
      const call = runAddByRSSParseAllMock.mock.calls[0];
      expect(call).toBeDefined();
      const params: {
        onQueued: (feedUrl: string) => Promise<void>;
        onStatusUpdate: (feedUrl: string, statusResponse: { status: string }) => Promise<void>;
      } = call?.[0];
      await params.onQueued(addingUrl);
      await params.onQueued('https://example.com/old.xml');
      await params.onStatusUpdate(addingUrl, { status: 'failed' });
      await params.onStatusUpdate('https://example.com/old.xml', { status: 'parsed' });
    } finally {
      releaseAddByRSSParseInFlight(addingUrl);
    }

    expect(applyAddByRSSParseStatusMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ feedUrl: addingUrl })
    );
    expect(applyAddByRSSParseStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedUrl: 'https://example.com/old.xml', status: 'queued' })
    );
    expect(applyAddByRSSParseStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedUrl: 'https://example.com/old.xml', status: 'parsed' })
    );
  });

  it('keeps going and logs once when a step fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    syncAddByRSSFollowStubsMock.mockRejectedValue(new Error('offline'));

    await expect(
      runAddByRSSBackgroundRefresh(member('account-d'), NOW_MS)
    ).resolves.toBeUndefined();
    await runAddByRSSBackgroundRefresh(member('account-e'), NOW_MS);

    expect(enqueueAddByRSSFirstParsesMock).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAddByRSSFeedByUrlMock, upsertAddByRSSFeedMock } = vi.hoisted(() => ({
  getAddByRSSFeedByUrlMock: vi.fn(),
  upsertAddByRSSFeedMock: vi.fn(),
}));

vi.mock('./storage', () => ({
  getAddByRSSFeedByUrl: getAddByRSSFeedByUrlMock,
  upsertAddByRSSFeed: upsertAddByRSSFeedMock,
}));

import { applyAddByRSSParseStatus } from './actions';
import type { AddByRSSFeedRecord } from './types';

const baseRecord: AddByRSSFeedRecord = {
  id: 1,
  idText: 'test-id',
  resourceType: 'podcasts',
  feedUrl: 'https://example.com/feed.xml',
  title: 'Test Feed',
  imageUrl: null,
  status: 'queued',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastParsedAt: '2024-01-01T00:00:00.000Z',
  lastFailedParseAt: null,
};

describe('applyAddByRSSParseStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAddByRSSFeedByUrlMock.mockResolvedValue(baseRecord);
    upsertAddByRSSFeedMock.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets lastFailedParseAt to the same timestamp as updatedAt when status is failed', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'failed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        updatedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-06-01T12:00:00.000Z',
      })
    );
  });

  it('updates lastParsedAt and preserves lastFailedParseAt when status is parsed', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'parsed',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastParsedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });

  it('updates lastParsedAt and preserves lastFailedParseAt when status is not_modified', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'not_modified',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastParsedAt: '2024-06-01T12:00:00.000Z',
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });

  it('records a credential failure and flags the feed so the list asks for credentials', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'failed',
      outcome: { failureReason: 'credentials_rejected', credentialsState: 'sent' },
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailureReason: 'credentials_rejected',
        requiresCredentials: true,
      })
    );
  });

  it('clears the last failure reason when a parse succeeds', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      requiresCredentials: true,
      lastFailureReason: 'credentials_rejected',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'parsed',
      outcome: { credentialsState: 'sent' },
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailureReason: null,
        requiresCredentials: true,
      })
    );
  });

  it('keeps the last failure reason while a new parse is in progress', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailureReason: 'credentials_required',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'queued',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ lastFailureReason: 'credentials_required' })
    );
  });

  it('preserves lastFailedParseAt on non-failure statuses', async () => {
    getAddByRSSFeedByUrlMock.mockResolvedValue({
      ...baseRecord,
      lastFailedParseAt: '2024-05-01T00:00:00.000Z',
    });

    await applyAddByRSSParseStatus({
      feedUrl: baseRecord.feedUrl,
      parsedFeed: undefined,
      status: 'processing',
    });

    expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFailedParseAt: '2024-05-01T00:00:00.000Z',
      })
    );
  });
});

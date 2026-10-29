import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertByDedupeKeyMock } = vi.hoisted(() => ({
  upsertByDedupeKeyMock: vi.fn(async (dto: Record<string, unknown>) => ({
    id: 1,
    status: 'pending',
    ...dto,
  })),
}));

vi.mock('@orm/services/account/scheduledJob.js', () => ({
  ScheduledJobService: class MockScheduledJobService {
    upsertByDedupeKey = upsertByDedupeKeyMock;
  },
}));

import {
  buildRemoteStubPromoteDedupeKey,
  buildRemoteStubRecheckDedupeKey,
  buildRemoteStubRepointDedupeKey,
  parseRemoteStubPromotePayload,
  parseRemoteStubRecheckPayload,
  parseRemoteStubRepointPayload,
  REMOTE_STUB_PROMOTE_JOB_TYPE,
  REMOTE_STUB_RECHECK_JOB_TYPE,
  REMOTE_STUB_REPOINT_JOB_TYPE,
  scheduleRemoteStubPromote,
  scheduleRemoteStubRecheck,
  scheduleRemoteStubRepoint,
} from './remoteStubJobScheduler.js';

describe('remote stub job payload parsing', () => {
  it('parses recheck payload with a positive integer id', () => {
    expect(parseRemoteStubRecheckPayload({ remoteChannelStubId: 42 })).toEqual({
      remoteChannelStubId: 42,
    });
  });

  it('rejects invalid recheck payload ids', () => {
    expect(parseRemoteStubRecheckPayload({})).toBeNull();
    expect(parseRemoteStubRecheckPayload({ remoteChannelStubId: '42' })).toBeNull();
    expect(parseRemoteStubRecheckPayload({ remoteChannelStubId: 0 })).toBeNull();
    expect(parseRemoteStubRecheckPayload({ remoteChannelStubId: 1.5 })).toBeNull();
    expect(parseRemoteStubRecheckPayload(null)).toBeNull();
  });

  it('parses repoint payload with a trimmed provider feed id', () => {
    expect(
      parseRemoteStubRepointPayload({
        remoteChannelStubId: 42,
        targetProviderFeedId: '  9001  ',
      })
    ).toEqual({
      remoteChannelStubId: 42,
      targetProviderFeedId: '9001',
    });
  });

  it('rejects invalid repoint payload values', () => {
    expect(parseRemoteStubRepointPayload({ targetProviderFeedId: '9001' })).toBeNull();
    expect(
      parseRemoteStubRepointPayload({ remoteChannelStubId: 42, targetProviderFeedId: '' })
    ).toBeNull();
    expect(
      parseRemoteStubRepointPayload({
        remoteChannelStubId: 42,
        targetProviderFeedId: ' '.repeat(4),
      })
    ).toBeNull();
    expect(
      parseRemoteStubRepointPayload({
        remoteChannelStubId: 42,
        targetProviderFeedId: '1'.repeat(51),
      })
    ).toBeNull();
  });

  it('parses promote payload with a known provider id', () => {
    expect(
      parseRemoteStubPromotePayload({
        indexProvider: 'podcast_index',
        providerFeedId: '  9001  ',
      })
    ).toEqual({
      indexProvider: 'podcast_index',
      providerFeedId: '9001',
    });
  });

  it('rejects invalid promote payload values', () => {
    expect(
      parseRemoteStubPromotePayload({
        indexProvider: 'unknown',
        providerFeedId: '9001',
      })
    ).toBeNull();
    expect(parseRemoteStubPromotePayload({ indexProvider: 'podcast_index' })).toBeNull();
    expect(
      parseRemoteStubPromotePayload({
        indexProvider: 'podcast_index',
        providerFeedId: '',
      })
    ).toBeNull();
  });
});

describe('remote stub job dedupe keys', () => {
  it('builds dedupe keys per job type', () => {
    expect(buildRemoteStubRecheckDedupeKey(11)).toBe(`${REMOTE_STUB_RECHECK_JOB_TYPE}:11`);
    expect(buildRemoteStubRepointDedupeKey(12)).toBe(`${REMOTE_STUB_REPOINT_JOB_TYPE}:12`);
    expect(buildRemoteStubPromoteDedupeKey('podcast_index', '13')).toBe(
      `${REMOTE_STUB_PROMOTE_JOB_TYPE}:podcast_index:13`
    );
  });
});

describe('remote stub job scheduling', () => {
  beforeEach(() => {
    upsertByDedupeKeyMock.mockClear();
  });

  it('schedules recheck jobs with dedupe, payload, now run time, and max attempts', async () => {
    await scheduleRemoteStubRecheck(55);

    expect(upsertByDedupeKeyMock).toHaveBeenCalledWith({
      dedupe_key: 'remote-stub-recheck:55',
      job_type: REMOTE_STUB_RECHECK_JOB_TYPE,
      max_attempts: 3,
      payload: { remoteChannelStubId: 55 },
      run_after: expect.any(Date),
    });
  });

  it('schedules repoint jobs with dedupe, payload, now run time, and max attempts', async () => {
    await scheduleRemoteStubRepoint(55, '9001');

    expect(upsertByDedupeKeyMock).toHaveBeenCalledWith({
      dedupe_key: 'remote-stub-repoint:55',
      job_type: REMOTE_STUB_REPOINT_JOB_TYPE,
      max_attempts: 3,
      payload: { remoteChannelStubId: 55, targetProviderFeedId: '9001' },
      run_after: expect.any(Date),
    });
  });

  it('schedules promote jobs with dedupe, payload, now run time, and max attempts', async () => {
    await scheduleRemoteStubPromote('podcast_index', '9001');

    expect(upsertByDedupeKeyMock).toHaveBeenCalledWith({
      dedupe_key: 'remote-stub-promote:podcast_index:9001',
      job_type: REMOTE_STUB_PROMOTE_JOB_TYPE,
      max_attempts: 3,
      payload: { indexProvider: 'podcast_index', providerFeedId: '9001' },
      run_after: expect.any(Date),
    });
  });
});

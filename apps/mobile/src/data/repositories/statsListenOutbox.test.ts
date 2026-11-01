import { describe, expect, it } from 'vitest';

import type { ListenSessionReport } from '@podverse/playback-core';

import type { StatsListenOutboxRecord } from './statsListenOutbox';
import {
  classifyStatsListenSendFailure,
  isStatsListenOutboxRecordExpired,
  mergeStatsListenOutboxRecord,
  selectStatsListenOutboxEvictions,
  statsListenOutboxRecordFromReport,
  toStatsListenRequestBody,
} from './statsListenOutbox';

const DAY_MS = 86_400_000;

const record = (overrides: Partial<StatsListenOutboxRecord> = {}): StatsListenOutboxRecord => ({
  clientListenId: 'listen-1',
  accountIdText: 'account-1',
  targetKind: 'item',
  targetIdText: 'item-1',
  secondsHeard: 90,
  completed: false,
  firstReport: true,
  countedAtMs: 1_000,
  updatedAtMs: 2_000,
  mediaDurationSeconds: null,
  ...overrides,
});

describe('statsListenOutboxRecordFromReport', () => {
  it('copies the report and stamps the update time', () => {
    const report: ListenSessionReport = {
      target: { kind: 'clip', idText: 'clip-1', startSeconds: 10, endSeconds: 70, mediumId: null },
      clientListenId: 'listen-9',
      secondsHeard: 60,
      completed: true,
      countedAtMs: 5_000,
      firstReport: true,
      mediaDurationSeconds: 1_800,
    };

    expect(
      statsListenOutboxRecordFromReport({ report, accountIdText: 'account-2', nowMs: 9_000 })
    ).toEqual({
      clientListenId: 'listen-9',
      accountIdText: 'account-2',
      targetKind: 'clip',
      targetIdText: 'clip-1',
      secondsHeard: 60,
      completed: true,
      firstReport: true,
      countedAtMs: 5_000,
      updatedAtMs: 9_000,
      mediaDurationSeconds: 1_800,
    });
  });
});

describe('mergeStatsListenOutboxRecord', () => {
  it('returns the incoming record when nothing is stored', () => {
    const incoming = record();
    expect(mergeStatsListenOutboxRecord(null, incoming)).toBe(incoming);
  });

  it('keeps the larger heard seconds, sticky completion, the first-report flag, and the earlier count time', () => {
    const existing = record({ secondsHeard: 200, completed: true, firstReport: true });
    const incoming = record({
      secondsHeard: 120,
      completed: false,
      firstReport: false,
      countedAtMs: 4_000,
      updatedAtMs: 8_000,
    });

    expect(mergeStatsListenOutboxRecord(existing, incoming)).toEqual({
      ...existing,
      secondsHeard: 200,
      completed: true,
      firstReport: true,
      countedAtMs: 1_000,
      updatedAtMs: 8_000,
    });
  });

  it('keeps a positive loaded length and leaves a missing one in place', () => {
    const kept = mergeStatsListenOutboxRecord(record(), record({ mediaDurationSeconds: 240 }));
    expect(kept.mediaDurationSeconds).toBe(240);
    expect(
      mergeStatsListenOutboxRecord(
        record({ mediaDurationSeconds: 240 }),
        record({ mediaDurationSeconds: null })
      ).mediaDurationSeconds
    ).toBe(240);
  });

  it('clears the first-report flag only when both sides already reached the server', () => {
    const merged = mergeStatsListenOutboxRecord(
      record({ firstReport: false }),
      record({ firstReport: false, secondsHeard: 150 })
    );
    expect(merged.firstReport).toBe(false);
    expect(merged.secondsHeard).toBe(150);
  });
});

describe('isStatsListenOutboxRecordExpired', () => {
  it('keeps a session the server has not seen for the 30-day storage bound', () => {
    const first = record({ firstReport: true, countedAtMs: 0 });
    expect(isStatsListenOutboxRecordExpired(first, 29 * DAY_MS)).toBe(false);
    expect(isStatsListenOutboxRecordExpired(first, 30 * DAY_MS + 1)).toBe(true);
  });

  it('drops an update-only row after 6 days, inside the server 7-day session lookup', () => {
    const update = record({ firstReport: false, countedAtMs: 0 });
    expect(isStatsListenOutboxRecordExpired(update, 5 * DAY_MS)).toBe(false);
    expect(isStatsListenOutboxRecordExpired(update, 6 * DAY_MS + 1)).toBe(true);
  });
});

describe('classifyStatsListenSendFailure', () => {
  it('drops final statuses and retries the rest', () => {
    for (const status of [400, 403, 404, 410]) {
      expect(classifyStatsListenSendFailure(status)).toBe('drop');
    }
    for (const status of [401, 429, 500, 503, null]) {
      expect(classifyStatsListenSendFailure(status)).toBe('retry');
    }
  });
});

describe('toStatsListenRequestBody', () => {
  it('sends an item report by item id with no listen time', () => {
    const body = toStatsListenRequestBody(
      record({ secondsHeard: 75.9, completed: true, mediaDurationSeconds: 2_400 })
    );

    expect(body).toEqual({
      client_listen_id: 'listen-1',
      item_id_text: 'item-1',
      seconds_heard: 75,
      completed: true,
      media_duration_seconds: 2_400,
    });
    expect('clip_id_text' in body).toBe(false);
    expect('listened_at' in body).toBe(false);
    expect(toStatsListenRequestBody).toHaveLength(1);
  });

  it('sends a clip report by clip id and caps heard seconds at one day', () => {
    const body = toStatsListenRequestBody(
      record({ targetKind: 'clip', targetIdText: 'clip-1', secondsHeard: 100_000 })
    );

    expect(body.clip_id_text).toBe('clip-1');
    expect('item_id_text' in body).toBe(false);
    expect('listened_at' in body).toBe(false);
    expect(body.seconds_heard).toBe(86_400);
  });
});

describe('selectStatsListenOutboxEvictions', () => {
  const rows = [
    { clientListenId: 'c', countedAtMs: 300 },
    { clientListenId: 'a', countedAtMs: 100 },
    { clientListenId: 'b', countedAtMs: 200 },
  ];

  it('returns the oldest ids beyond the cap', () => {
    expect(selectStatsListenOutboxEvictions(rows, 1)).toEqual(['a', 'b']);
  });

  it('returns nothing at or under the cap', () => {
    expect(selectStatsListenOutboxEvictions(rows, 3)).toEqual([]);
    expect(selectStatsListenOutboxEvictions(rows, 5)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import type {
  SyncEventEvictionCandidate,
  SyncEventLogEntry,
  SyncEventOutcome,
} from './syncEventLog';
import {
  formatSyncEventLogEntryReport,
  formatSyncEventLogExport,
  parseSyncEventLogDetails,
  selectSyncEventEvictions,
  serializeSyncEventLogDetails,
  SYNC_EVENT_LOG_CAP,
} from './syncEventLog';

const candidate = (
  id: number,
  occurredAt: number,
  outcome: SyncEventOutcome = 'success'
): SyncEventEvictionCandidate => ({ id, occurredAt, outcome });

const entry = (partial: Partial<SyncEventLogEntry>): SyncEventLogEntry => ({
  details: {},
  errorCode: null,
  id: 1,
  jobKind: 'account-refresh',
  message: null,
  occurredAt: Date.parse('2026-08-29T06:00:00.000Z'),
  outcome: 'failure',
  ...partial,
});

describe('selectSyncEventEvictions', () => {
  it('evicts nothing while the log is at or under the cap', () => {
    const atCap = [candidate(1, 100), candidate(2, 200)];
    expect(selectSyncEventEvictions(atCap, 2)).toEqual([]);
    expect(selectSyncEventEvictions(atCap.slice(0, 1), 2)).toEqual([]);
    expect(selectSyncEventEvictions([], 2)).toEqual([]);
  });

  it('evicts exactly the overflow, oldest first', () => {
    const candidates = [candidate(3, 300), candidate(1, 100), candidate(2, 200), candidate(4, 400)];
    expect(selectSyncEventEvictions(candidates, 2)).toEqual([1, 2]);
  });

  it('breaks a same-millisecond tie by insertion order', () => {
    const candidates = [candidate(2, 100), candidate(1, 100), candidate(3, 100)];
    expect(selectSyncEventEvictions(candidates, 1)).toEqual([1, 2]);
  });

  it('drops successes, skips, and reconciles before it touches a failure', () => {
    // The failure is the oldest row, so a plain oldest-first rule would evict exactly the entry
    // somebody is about to report.
    const candidates = [
      candidate(1, 100, 'failure'),
      candidate(2, 200, 'success'),
      candidate(3, 300, 'skipped'),
      candidate(4, 400, 'reconciled'),
    ];
    expect(selectSyncEventEvictions(candidates, 2)).toEqual([2, 3]);
  });

  it('evicts failures only once nothing else is left, and then oldest first', () => {
    const candidates = [
      candidate(1, 100, 'failure'),
      candidate(2, 200, 'failure'),
      candidate(3, 300, 'success'),
      candidate(4, 400, 'failure'),
    ];
    expect(selectSyncEventEvictions(candidates, 2)).toEqual([3, 1]);
  });

  it('defaults to the shipped cap', () => {
    const candidates = Array.from({ length: SYNC_EVENT_LOG_CAP + 3 }, (_value, index) =>
      candidate(index + 1, index + 1)
    );
    expect(selectSyncEventEvictions(candidates)).toEqual([1, 2, 3]);
  });
});

describe('formatSyncEventLogExport', () => {
  it('puts the error code on every line so support has something stable to read', () => {
    const text = formatSyncEventLogExport([
      entry({
        errorCode: 'http_403:membership_required',
        id: 2,
        jobKind: 'subscriptions-page',
        message: 'Membership required',
      }),
    ]);

    expect(text.split('\n')).toEqual([
      'Error log (1)',
      '2026-08-29T06:00:00.000Z  failure  subscriptions-page  http_403:membership_required — Membership required',
    ]);
  });

  it('renders a missing code and message without leaving a ragged line', () => {
    const text = formatSyncEventLogExport([entry({ outcome: 'skipped' })]);
    expect(text).toBe('Error log (1)\n2026-08-29T06:00:00.000Z  skipped  account-refresh  -');
  });

  it('exports a header on its own when there is nothing to report', () => {
    expect(formatSyncEventLogExport([])).toBe('Error log (0)');
  });

  it('indents each entry’s details beneath it in display order', () => {
    const text = formatSyncEventLogExport([
      entry({
        details: { item_id_text: 'ep1', http_status: '404' },
        errorCode: 'http_404:ERROR_CODE_IO_BAD_HTTP_STATUS',
        jobKind: 'playback',
      }),
    ]);
    expect(text.split('\n')).toEqual([
      'Error log (1)',
      '2026-08-29T06:00:00.000Z  failure  playback  http_404:ERROR_CODE_IO_BAD_HTTP_STATUS',
      '    http_status: 404',
      '    item_id_text: ep1',
    ]);
  });
});

describe('error log details', () => {
  it('round-trips known keys and drops blanks', () => {
    const stored = serializeSyncEventLogDetails({
      http_status: '503',
      media_url: ' https://host.example/ep.mp3 ',
      native_detail: '   ',
    });
    expect(parseSyncEventLogDetails(stored)).toEqual({
      http_status: '503',
      media_url: 'https://host.example/ep.mp3',
    });
    expect(serializeSyncEventLogDetails({ native_detail: '' })).toBeNull();
    expect(serializeSyncEventLogDetails(undefined)).toBeNull();
  });

  it('strips URL credentials before storing, and leaves other @ signs alone', () => {
    const stored = serializeSyncEventLogDetails({
      feed_url: 'https://user:secret@host.example/feed.xml',
      media_url: 'https://host.example/a@b.mp3?k=v#f',
    });
    expect(parseSyncEventLogDetails(stored)).toEqual({
      feed_url: 'https://host.example/feed.xml',
      media_url: 'https://host.example/a@b.mp3?k=v#f',
    });
  });

  it('reads rows written before details existed, or by something else, as empty', () => {
    expect(parseSyncEventLogDetails(null)).toEqual({});
    expect(parseSyncEventLogDetails('not json')).toEqual({});
    expect(parseSyncEventLogDetails('[1,2]')).toEqual({});
    expect(parseSyncEventLogDetails('{"http_status":404,"unknown":"x","feed_url":"f"}')).toEqual({
      feed_url: 'f',
    });
  });
});

describe('formatSyncEventLogEntryReport', () => {
  it('copies everything support needs with stable labels', () => {
    const text = formatSyncEventLogEntryReport(
      entry({
        details: {
          channel_title: 'Some show',
          http_status: '403',
          media_url: 'https://host.example/ep.mp3?token=abc',
        },
        errorCode: 'http_403:item_failed',
        jobKind: 'playback',
        message: 'Forbidden',
      }),
      { appVersion: '5.0.0', platform: 'ios 18.2' }
    );
    expect(text.split('\n')).toEqual([
      'Error report',
      'time: 2026-08-29T06:00:00.000Z',
      'category: playback',
      'outcome: failure',
      'code: http_403:item_failed',
      'message: Forbidden',
      'http_status: 403',
      'media_url: https://host.example/ep.mp3?token=abc',
      'channel_title: Some show',
      'app_version: 5.0.0',
      'platform: ios 18.2',
    ]);
  });

  it('marks a missing code and omits a missing message', () => {
    const text = formatSyncEventLogEntryReport(entry({ outcome: 'skipped' }), {
      appVersion: '5.0.0',
      platform: 'android 33',
    });
    expect(text).toContain('code: -');
    expect(text).not.toContain('message:');
  });
});

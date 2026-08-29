import { describe, expect, it } from 'vitest';

import type {
  SyncEventEvictionCandidate,
  SyncEventLogEntry,
  SyncEventOutcome,
} from './syncEventLog';
import {
  formatSyncEventLogExport,
  selectSyncEventEvictions,
  SYNC_EVENT_LOG_CAP,
} from './syncEventLog';

const candidate = (
  id: number,
  occurredAt: number,
  outcome: SyncEventOutcome = 'success'
): SyncEventEvictionCandidate => ({ id, occurredAt, outcome });

const entry = (partial: Partial<SyncEventLogEntry>): SyncEventLogEntry => ({
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

  it('drops successes and skips before it touches a failure', () => {
    // The failure is the oldest row, so a plain oldest-first rule would evict exactly the entry
    // somebody is about to report.
    const candidates = [
      candidate(1, 100, 'failure'),
      candidate(2, 200, 'success'),
      candidate(3, 300, 'skipped'),
      candidate(4, 400, 'success'),
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
      'Podverse sync log (1)',
      '2026-08-29T06:00:00.000Z  failure  subscriptions-page  http_403:membership_required — Membership required',
    ]);
  });

  it('renders a missing code and message without leaving a ragged line', () => {
    const text = formatSyncEventLogExport([entry({ outcome: 'skipped' })]);
    expect(text).toBe('Podverse sync log (1)\n2026-08-29T06:00:00.000Z  skipped  account-refresh  -');
  });

  it('exports a header on its own when there is nothing to report', () => {
    expect(formatSyncEventLogExport([])).toBe('Podverse sync log (0)');
  });
});

import { describe, expect, it } from 'vitest';

import { partitionAccountNotificationsBySeenAt } from './accountNotification.js';

describe('partitionAccountNotificationsBySeenAt', () => {
  it('marks everything as new when lastSeenAt is null', () => {
    const rows = [
      { id: 1, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, created_at: '2026-01-02T00:00:00.000Z' },
    ];

    const result = partitionAccountNotificationsBySeenAt(rows, null);

    expect(result.newNotifications).toEqual(rows);
    expect(result.earlierNotifications).toEqual([]);
  });

  it('splits rows by created_at and keeps ordering within each bucket', () => {
    const rows = [
      { id: 10, created_at: new Date('2026-02-03T10:00:00.000Z') },
      { id: 11, created_at: new Date('2026-02-03T09:00:00.000Z') },
      { id: 12, created_at: new Date('2026-02-03T08:00:00.000Z') },
    ];

    const result = partitionAccountNotificationsBySeenAt(
      rows,
      new Date('2026-02-03T08:30:00.000Z')
    );

    expect(result.newNotifications.map((row) => row.id)).toEqual([10, 11]);
    expect(result.earlierNotifications.map((row) => row.id)).toEqual([12]);
  });

  it('treats rows at lastSeenAt timestamp as earlier', () => {
    const rows = [{ id: 50, created_at: '2026-03-01T12:00:00.000Z' }];
    const result = partitionAccountNotificationsBySeenAt(rows, '2026-03-01T12:00:00.000Z');
    expect(result.newNotifications).toEqual([]);
    expect(result.earlierNotifications.map((row) => row.id)).toEqual([50]);
  });
});

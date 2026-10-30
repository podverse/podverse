import { describe, expect, it } from 'vitest';

import type { DTOAccountNotification } from '../dtos/account/accountNotification.js';
import { applyNotificationVisitUnread } from './accountNotificationVisitUnread.js';
import { NotificationCategoryEnum } from './notificationCategory.js';

const notification = (id: number, isUnread = true): DTOAccountNotification => ({
  account_id: 7,
  body: `Body ${id}`,
  category: NotificationCategoryEnum.NewContent,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-02-01T00:00:00.000Z',
  id,
  is_unread: isUnread,
  link_path: '/notifications',
  payload: null,
  title: `Title ${id}`,
});

describe('applyNotificationVisitUnread', () => {
  it('records unread rows and returns the same array when they already read unread', () => {
    const visitUnreadIds = new Set<number>();
    const rows = [notification(1), notification(2)];

    const result = applyNotificationVisitUnread(visitUnreadIds, rows);

    expect(result.visitUnreadIds).toEqual(new Set([1, 2]));
    expect(visitUnreadIds.size).toBe(0);
    expect(result.rows).toBe(rows);
  });

  it('keeps a recorded row unread after the server reports it read', () => {
    const visitUnreadIds = new Set<number>([1]);
    const recorded = notification(1, false);
    const neverRecorded = notification(2, false);
    const rows = [recorded, neverRecorded];

    const result = applyNotificationVisitUnread(visitUnreadIds, rows);

    expect(result.rows[0]).toEqual({ ...recorded, is_unread: true });
    expect(result.rows[0]).not.toBe(recorded);
    expect(recorded.is_unread).toBe(false);
    expect(result.rows[1]).toBe(neverRecorded);
    expect(result.visitUnreadIds).toBe(visitUnreadIds);
  });

  it('returns the same set when rows add no unread id', () => {
    const visitUnreadIds = new Set<number>([1]);
    const rows = [notification(1)];

    const result = applyNotificationVisitUnread(visitUnreadIds, rows);

    expect(result.visitUnreadIds).toBe(visitUnreadIds);
    expect(result.rows).toBe(rows);
  });

  it('returns both inputs when the set is empty and every row is read', () => {
    const visitUnreadIds = new Set<number>();
    const rows = [notification(1, false), notification(2, false)];

    const result = applyNotificationVisitUnread(visitUnreadIds, rows);

    expect(result.visitUnreadIds).toBe(visitUnreadIds);
    expect(result.rows).toBe(rows);
  });
});

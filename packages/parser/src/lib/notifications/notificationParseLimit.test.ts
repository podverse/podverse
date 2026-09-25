import { describe, expect, it } from 'vitest';

import {
  limitNotificationsPerParse,
  NOTIFICATIONS_PER_EVENT_PER_PARSE,
} from './notificationParseLimit.js';

describe('limitNotificationsPerParse', () => {
  it('keeps one row when a parse produced many', () => {
    const items = Array.from({ length: 100 }, (_, index) => index);
    expect(NOTIFICATIONS_PER_EVENT_PER_PARSE).toBe(1);
    expect(limitNotificationsPerParse(items)).toEqual([0]);
  });

  it('returns an empty list when there is nothing to announce', () => {
    expect(limitNotificationsPerParse([])).toEqual([]);
  });
});

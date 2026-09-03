import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS,
  DEFAULT_SCHEDULED_JOB_RETENTION_DAYS,
  DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS,
} from '@podverse/helpers';

import {
  getNotificationsRetentionConfig,
  getOnDemandParserEventRetentionConfig,
  getScheduledJobRetentionConfig,
  getStatsConfig,
} from './index.js';

/**
 * Every retention window is read the same way, so they are covered together: a case added here is a
 * window that cannot ship without someone deciding what its default and variable are.
 */
const RETENTION_CASES: readonly {
  name: string;
  envKey: string;
  fallback: number;
  read: () => number;
}[] = [
  {
    name: 'notifications',
    envKey: 'NOTIFICATION_RETENTION_DAYS',
    fallback: DEFAULT_NOTIFICATION_RETENTION_DAYS,
    read: () => getNotificationsRetentionConfig().retentionDays,
  },
  {
    name: 'scheduled jobs',
    envKey: 'SCHEDULED_JOB_RETENTION_DAYS',
    fallback: DEFAULT_SCHEDULED_JOB_RETENTION_DAYS,
    read: () => getScheduledJobRetentionConfig().retentionDays,
  },
  {
    name: 'on-demand parser events',
    envKey: 'ON_DEMAND_PARSER_EVENT_RETENTION_DAYS',
    fallback: DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS,
    read: () => getOnDemandParserEventRetentionConfig().retentionDays,
  },
  {
    name: 'stats track events',
    envKey: 'STATS_TRACK_EVENT_RETENTION_DAYS',
    fallback: DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS,
    read: () => getStatsConfig().trackEventRetentionDays,
  },
];

describe.each(RETENTION_CASES)('$name retention window', ({ envKey, fallback, read }) => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[envKey];
    delete process.env[envKey];
  });

  afterEach(() => {
    if (saved === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = saved;
    }
  });

  it('falls back to the shared default when unset', () => {
    expect(read()).toBe(fallback);
  });

  it('parses an explicit window', () => {
    process.env[envKey] = '45';
    expect(read()).toBe(45);
  });

  it('treats a blank value as unset rather than zero', () => {
    process.env[envKey] = '  ';
    expect(read()).toBe(fallback);
  });

  it('leaves an unparseable value as NaN for startup validation to reject', () => {
    process.env[envKey] = 'thirty';
    expect(read()).toBeNaN();
  });
});

describe('retention windows are independent', () => {
  it('tuning one does not move another', () => {
    const savedNotifications = process.env.NOTIFICATION_RETENTION_DAYS;
    process.env.NOTIFICATION_RETENTION_DAYS = '7';

    try {
      expect(getNotificationsRetentionConfig().retentionDays).toBe(7);
      expect(getScheduledJobRetentionConfig().retentionDays).toBe(
        DEFAULT_SCHEDULED_JOB_RETENTION_DAYS
      );
    } finally {
      if (savedNotifications === undefined) {
        delete process.env.NOTIFICATION_RETENTION_DAYS;
      } else {
        process.env.NOTIFICATION_RETENTION_DAYS = savedNotifications;
      }
    }
  });
});

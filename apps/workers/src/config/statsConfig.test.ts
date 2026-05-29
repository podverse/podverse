import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS } from '@podverse/helpers';

import { getStatsConfig } from './index.js';

describe('getStatsConfig', () => {
  let savedRetentionDays: string | undefined;

  beforeEach(() => {
    savedRetentionDays = process.env.STATS_TRACK_EVENT_RETENTION_DAYS;
    delete process.env.STATS_TRACK_EVENT_RETENTION_DAYS;
  });

  afterEach(() => {
    if (savedRetentionDays === undefined) {
      delete process.env.STATS_TRACK_EVENT_RETENTION_DAYS;
    } else {
      process.env.STATS_TRACK_EVENT_RETENTION_DAYS = savedRetentionDays;
    }
  });

  it('defaults to 30 days when unset', () => {
    const config = getStatsConfig();
    expect(config.trackEventRetentionDays).toBe(DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS);
  });

  it('parses explicit retention days', () => {
    process.env.STATS_TRACK_EVENT_RETENTION_DAYS = '45';
    const config = getStatsConfig();
    expect(config.trackEventRetentionDays).toBe(45);
  });
});

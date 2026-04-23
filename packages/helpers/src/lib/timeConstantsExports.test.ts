import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POLL_DELAY_MS,
  FIFTEEN_MINUTES_MS,
  LIVE_ITEM_POLL_INTERVAL_MS,
  ONE_MINUTE_MS,
  SERVER_READY_WAIT_MAX_ATTEMPTS_API,
  SERVER_READY_WAIT_MAX_ATTEMPTS_WEB,
} from './timeConstants.js';

describe('timeConstants exports', () => {
  it('keeps minute-based durations internally consistent', () => {
    expect(FIFTEEN_MINUTES_MS).toBe(15 * ONE_MINUTE_MS);
    expect(DEFAULT_POLL_DELAY_MS).toBe(1000);
    expect(LIVE_ITEM_POLL_INTERVAL_MS).toBe(5000);
  });

  it('uses positive server-ready attempt budgets', () => {
    expect(SERVER_READY_WAIT_MAX_ATTEMPTS_WEB).toBeGreaterThan(0);
    expect(SERVER_READY_WAIT_MAX_ATTEMPTS_API).toBeGreaterThan(0);
  });
});

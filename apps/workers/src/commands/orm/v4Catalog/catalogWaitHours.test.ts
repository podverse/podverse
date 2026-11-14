import { describe, expect, it } from 'vitest';

import { ONE_HOUR_MS } from '@podverse/helpers';

import {
  CATALOG_WAIT_HOURS_ERROR,
  catalogWaitDeadlineMs,
  catalogWaitHoursFromArgs,
  DEFAULT_CATALOG_WAIT_HOURS,
} from './catalogWaitHours.js';

function errorMessage(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
  throw new Error('expected a throw');
}

describe('catalogWaitHoursFromArgs', () => {
  it('defaults to 24 hours and accepts a positive number', () => {
    expect(catalogWaitHoursFromArgs({})).toBe(DEFAULT_CATALOG_WAIT_HOURS);
    expect(catalogWaitHoursFromArgs({ 'catalog-wait-hours': '1.5' })).toBe(1.5);
    expect(catalogWaitHoursFromArgs({ 'catalog-wait-hours': '24' })).toBe(24);
    expect(catalogWaitDeadlineMs(24)).toBe(24 * ONE_HOUR_MS);
  });

  it('rejects 0, a negative, a blank, and a non-number', () => {
    expect(errorMessage(() => catalogWaitHoursFromArgs({ 'catalog-wait-hours': '0' }))).toBe(
      CATALOG_WAIT_HOURS_ERROR
    );
    expect(errorMessage(() => catalogWaitHoursFromArgs({ 'catalog-wait-hours': '-2' }))).toBe(
      CATALOG_WAIT_HOURS_ERROR
    );
    expect(errorMessage(() => catalogWaitHoursFromArgs({ 'catalog-wait-hours': '' }))).toBe(
      CATALOG_WAIT_HOURS_ERROR
    );
    expect(errorMessage(() => catalogWaitHoursFromArgs({ 'catalog-wait-hours': '   ' }))).toBe(
      CATALOG_WAIT_HOURS_ERROR
    );
    expect(errorMessage(() => catalogWaitHoursFromArgs({ 'catalog-wait-hours': 'no' }))).toBe(
      CATALOG_WAIT_HOURS_ERROR
    );
  });
});

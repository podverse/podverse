import type { CommandLineArgs } from '@workers/commands/index.js';

import { ONE_HOUR_MS } from '@podverse/helpers';

export const DEFAULT_CATALOG_WAIT_HOURS = 24;

export const CATALOG_WAIT_HOURS_ERROR = '--catalog-wait-hours must be a positive number.';

/** Hours from `--catalog-wait-hours`. Omitted means `DEFAULT_CATALOG_WAIT_HOURS`. */
export function catalogWaitHoursFromArgs(args: CommandLineArgs): number {
  if (!Object.prototype.hasOwnProperty.call(args, 'catalog-wait-hours')) {
    return DEFAULT_CATALOG_WAIT_HOURS;
  }
  const raw = args['catalog-wait-hours'];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') {
    throw new Error(CATALOG_WAIT_HOURS_ERROR);
  }
  const hours = Number(value);
  const deadlineMs = catalogWaitDeadlineMs(hours);
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(deadlineMs)) {
    throw new Error(CATALOG_WAIT_HOURS_ERROR);
  }
  return hours;
}

export function catalogWaitDeadlineMs(hours: number): number {
  return hours * ONE_HOUR_MS;
}

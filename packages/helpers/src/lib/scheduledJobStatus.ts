export enum ScheduledJobStatusEnum {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export const SCHEDULED_JOB_STATUS_VALUES = Object.values(ScheduledJobStatusEnum);

export type ScheduledJobStatusValues = (typeof SCHEDULED_JOB_STATUS_VALUES)[number];

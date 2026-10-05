/**
 * Processors deliver notifications out of order, so a subscription remembers when its current
 * status took effect and ignores an older status change. The time is kept inside
 * `raw_status_snapshot` under `status_changed_at`, beside the processor's own view under
 * `processor_snapshot` when a reconciliation fetched one.
 */

const STATUS_CHANGED_AT_KEY = 'status_changed_at';
const PROCESSOR_SNAPSHOT_KEY = 'processor_snapshot';

export function readStatusChangedAt(
  rawStatusSnapshot: Record<string, unknown> | null
): Date | null {
  const value = rawStatusSnapshot?.[STATUS_CHANGED_AT_KEY];
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function stampStatusChange(
  rawStatusSnapshot: Record<string, unknown> | null,
  changedAt: Date,
  processorSnapshot?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...rawStatusSnapshot,
    [STATUS_CHANGED_AT_KEY]: changedAt.toISOString(),
    ...(processorSnapshot === undefined ? {} : { [PROCESSOR_SNAPSHOT_KEY]: processorSnapshot }),
  };
}

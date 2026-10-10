import type { PopularityTrackingChoice } from '@podverse/helpers';

export type PopularityTrackingStatusKey =
  | 'already_agreed'
  | 'status_opted_out'
  | 'status_stale'
  | 'status_undecided';

export function popularityTrackingStatusKey(
  choice: PopularityTrackingChoice
): PopularityTrackingStatusKey {
  switch (choice) {
    case 'allowed':
      return 'already_agreed';
    case 'opted_out':
      return 'status_opted_out';
    case 'stale_acceptance':
      return 'status_stale';
    case 'undecided':
      return 'status_undecided';
  }
}

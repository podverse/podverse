import { formatSavedDuration } from '@podverse/helpers';
import type { TFunction } from 'i18next';

/** Localized "2 years, 2 months" for membership saved-time copy. Null when there is no time. */
export const formatMembershipSavedDuration = (
  seconds: number,
  t: TFunction
): string | null =>
  formatSavedDuration(seconds, (segment) =>
    t(`membership.saved_duration_${segment.unit}_${segment.count === 1 ? 'one' : 'other'}`, {
      count: segment.count,
    })
  );

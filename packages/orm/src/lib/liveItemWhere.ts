import type { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import type { FindOptionsWhere } from 'typeorm';
import { IsNull, MoreThanOrEqual } from 'typeorm';

import { getEndedLiveItemVisibilityCutoff } from '@podverse/helpers';

/**
 * For ended live items, returns the two live_item time-window variants that keep only
 * livestreams that ended within the visibility window:
 *   (end_time >= cutoff) OR (end_time IS NULL AND start_time >= cutoff)
 *
 * TypeORM ANDs fields within a nested relation, so the OR must be expressed as a
 * two-element `where` array (callers repeat the shared conditions in each element).
 */
export function buildEndedLiveItemTimeVariants(
  cutoff: Date = getEndedLiveItemVisibilityCutoff()
): FindOptionsWhere<LiveItem>[] {
  return [
    { end_time: MoreThanOrEqual(cutoff) },
    { end_time: IsNull(), start_time: MoreThanOrEqual(cutoff) },
  ];
}

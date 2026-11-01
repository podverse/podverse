import { In, IsNull, Not } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';
import { getMediumIdArrayFromType } from '@podverse/helpers';

import { getChannelCategoryWhere } from './categoryFilterWhere.js';
import { resolveIdListFilter } from './listIdFilter.js';

type ActiveFeedWhere = {
  channel_ids: number[] | null;
  exclude_channel_ids?: number[] | null;
  mediumType: QueryParamsMedium | null;
  category_id: number | null;
};

/**
 * Shared Channel / popularity-list filter for public directory feeds. Optional include and
 * exclude channel id lists use the same rules as `resolveIdListFilter`. An empty combined list
 * uses `id IN ()` so the query returns no rows.
 */
export function getActiveFeedWhere({
  channel_ids,
  exclude_channel_ids,
  mediumType,
  category_id,
}: ActiveFeedWhere) {
  const medium_ids = getMediumIdArrayFromType(mediumType);
  const idFilter = resolveIdListFilter(channel_ids ?? undefined, exclude_channel_ids ?? undefined);
  const id = idFilter.empty ? In([]) : idFilter.id;

  return {
    channel: {
      ...(id ? { id } : {}),
      ...(!idFilter.empty && medium_ids ? { medium_id: In(medium_ids) } : {}),
      ...(!idFilter.empty ? getChannelCategoryWhere(category_id) : {}),
      channel_about: {
        id: Not(IsNull()),
      },
      feed: {
        feed_policy: {
          public_visible: true,
        },
      },
    },
  };
}

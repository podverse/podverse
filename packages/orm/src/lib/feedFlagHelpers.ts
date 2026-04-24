import { FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus.js';
import { Equal, In, IsNull, Not } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';
import { getMediumIdArrayFromType } from '@podverse/helpers';

type ActiveFeedWhere = {
  channel_ids: number[] | null;
  mediumType: QueryParamsMedium | null;
  category_id: number | null;
};

export function getActiveFeedWhere({ channel_ids, mediumType, category_id }: ActiveFeedWhere) {
  const medium_ids = getMediumIdArrayFromType(mediumType);
  return {
    channel: {
      ...(channel_ids?.length ? { id: In(channel_ids) } : {}),
      ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
      ...(category_id ? { channel_categories: { category_id: Equal(category_id) } } : {}),
      channel_about: {
        id: Not(IsNull()),
      },
      feed: {
        feed_flag_status: In([
          FeedFlagStatusStatusEnum.Active,
          FeedFlagStatusStatusEnum.AlwaysParse,
        ]),
      },
    },
  };
}

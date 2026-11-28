import { localChannelPeopleSections } from '@podverse/helpers';

import { compatItemPersonDtos } from '../compat/partytime/item.js';
import type { AddByRSSMappedFeed } from './types.js';

/**
 * Cast and Appearances from a mapped Add by RSS feed.
 *
 * Livestream people use the same credit shape as episodes. A livestream without its own
 * publication time uses the live start time.
 */
export const localPeopleSectionsFromMappedFeed = (
  mappedFeed: AddByRSSMappedFeed | null | undefined
) => {
  const items = mappedFeed?.items ?? [];
  const liveItems = mappedFeed?.liveItems ?? [];
  return localChannelPeopleSections({
    cast: mappedFeed?.channel.people ?? [],
    items: [
      ...items.map((item) => ({
        people: item.people,
        publishedAt: item.item.pub_date,
      })),
      ...liveItems.map((live) => ({
        people: compatItemPersonDtos(live.item),
        publishedAt: live.item.pubDate ?? live.liveItem.start_time,
      })),
    ],
  });
};

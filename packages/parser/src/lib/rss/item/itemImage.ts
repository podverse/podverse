import type { Episode } from 'podverse-partytime/core';

import type { EntityManager, Item } from '@podverse/orm';
import { ItemImageService } from '@podverse/orm';
import { compatItemImageDtos, itemImagesNotOnChannel } from '@podverse/parser-mapping';

import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemImage = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager,
  channelImageUrls: ReadonlySet<string> = new Set()
) => {
  const itemImageService = new ItemImageService(transactionalEntityManager);
  const itemImageDtos = itemImagesNotOnChannel(compatItemImageDtos(parsedItem), channelImageUrls);
  await handleParsedManyData(item, itemImageService, itemImageDtos);
};

import { loggerService } from '@parser/factories/loggerService.js';
import type { DescriptionIngestContext } from '@parser/lib/rss/descriptionIngestContext.js';
import { recordPreparedDescription } from '@parser/lib/rss/descriptionIngestContext.js';
import type { Episode } from 'podverse-partytime/core';

import type { PreparedDescription } from '@podverse/helpers';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemDescriptionService } from '@podverse/orm';
import { compatItemDescriptionDto } from '@podverse/parser-mapping';

import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemDescription = async (
  parsedItem: Episode,
  item: Item,
  context: DescriptionIngestContext,
  transactionalEntityManager?: EntityManager
) => {
  let itemDescriptionDto: PreparedDescription | null;
  try {
    itemDescriptionDto = compatItemDescriptionDto(parsedItem, context.tier);
  } catch (error) {
    // A description must never fail the parse; the stored row stays as it was.
    const reason = error instanceof Error ? error.message : String(error);
    loggerService.warn(`handleParsedItemDescription: skipped item ${item.id}: ${reason}`);
    return;
  }

  recordPreparedDescription(context, itemDescriptionDto);
  const itemDescriptionService = new ItemDescriptionService(transactionalEntityManager);
  await handleParsedOneData(item, itemDescriptionService, itemDescriptionDto);
};

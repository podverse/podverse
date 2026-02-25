import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemTranscriptService } from '@podverse/orm';
import { compatItemTranscriptDtos } from '@podverse/parser-mapping';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemTranscript = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemTranscriptService = new ItemTranscriptService(transactionalEntityManager);
  const itemTranscriptDtos = compatItemTranscriptDtos(parsedItem);
  await handleParsedManyData(item, itemTranscriptService, itemTranscriptDtos);
};

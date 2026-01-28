import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemTranscriptService } from '@podverse/orm';
import { compatItemTranscriptDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemTranscript = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemTranscriptService = new ItemTranscriptService(transactionalEntityManager);
  const itemTranscriptDtos = compatItemTranscriptDtos(parsedItem);
  await handleParsedManyData(item, itemTranscriptService, itemTranscriptDtos);
};

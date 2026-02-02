import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemLicenseService } from '@podverse/orm';
import { compatItemLicenseDto } from '@parser/lib/compat/partytime/item.js';
import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemLicense = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemLicenseService = new ItemLicenseService(transactionalEntityManager);
  const itemLicenseDto = compatItemLicenseDto(parsedItem);
  await handleParsedOneData(item, itemLicenseService, itemLicenseDto);
};

import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemLicenseService } from '@podverse/orm';
import { compatItemLicenseDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemLicense = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemLicenseService = new ItemLicenseService(transactionalEntityManager);
  const itemLicenseDto = compatItemLicenseDto(parsedItem);
  await handleParsedOneData(item, itemLicenseService, itemLicenseDto);
};

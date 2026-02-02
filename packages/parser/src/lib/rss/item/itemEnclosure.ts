import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import {
  ItemEnclosureService,
  ItemEnclosureSourceService,
  ItemEnclosureIntegrityService,
} from '@podverse/orm';
import { compatItemEnclosureDtos } from '@parser/lib/compat/partytime/item.js';

export const handleParsedItemEnclosure = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemEnclosureService = new ItemEnclosureService(transactionalEntityManager);
  const itemEnclosureDtos = compatItemEnclosureDtos(parsedItem);

  if (itemEnclosureDtos.length > 0) {
    for (const itemEnclosureDto of itemEnclosureDtos) {
      const item_enclosure = await itemEnclosureService.update(
        item,
        itemEnclosureDto.item_enclosure
      );

      const itemEnclosureSourceDtos = itemEnclosureDto.item_enclosure_sources;
      if (itemEnclosureSourceDtos.length > 0) {
        const itemEnclosureSourceService = new ItemEnclosureSourceService(
          transactionalEntityManager
        );
        await itemEnclosureSourceService.updateMany(item_enclosure, itemEnclosureSourceDtos);
      } else {
        await itemEnclosureService.deleteAll(item);
      }

      const itemEnclosureIntegrityDto = itemEnclosureDto.item_enclosure_integrity;
      if (itemEnclosureIntegrityDto) {
        const itemEnclosureIntegrityService = new ItemEnclosureIntegrityService(
          transactionalEntityManager
        );
        await itemEnclosureIntegrityService.update(item_enclosure, itemEnclosureIntegrityDto);
      }
    }
  } else {
    await itemEnclosureService.deleteAll(item);
  }
};

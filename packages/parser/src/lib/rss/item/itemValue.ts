import type { Episode } from 'podverse-partytime';
import { hasValidFeedUuid } from '@podverse/helpers';
import type { EntityManager, Item, Channel } from '@podverse/orm';
import {
  ItemValueService,
  ItemValueRecipientService,
  ItemValueTimeSplitService,
  ItemValueTimeSplitRecipientService,
  ItemValueTimeSplitRemoteItemService,
  ChannelService,
} from '@podverse/orm';
import { compatItemValueDtos } from '@podverse/parser-mapping';

export const handleParsedItemValue = async (
  parsedItem: Episode,
  item: Item,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  const itemValueService = new ItemValueService(transactionalEntityManager);
  const itemValueDtos = compatItemValueDtos(parsedItem);
  const itemValueRecipientService = new ItemValueRecipientService(transactionalEntityManager);
  const itemValueTimeSplitService = new ItemValueTimeSplitService(transactionalEntityManager);
  const itemValueTimeSplitRecipientService = new ItemValueTimeSplitRecipientService(
    transactionalEntityManager
  );
  const itemValueTimeSplitRemoteItemService = new ItemValueTimeSplitRemoteItemService(
    transactionalEntityManager
  );

  if (itemValueDtos.length > 0) {
    for (const itemValueDto of itemValueDtos) {
      const item_value = await itemValueService.update(item, itemValueDto.item_value);

      const itemValueRecipientDtos = itemValueDto.item_value_recipients;
      if (itemValueRecipientDtos.length > 0) {
        for (const itemValueRecipientDto of itemValueRecipientDtos) {
          await itemValueRecipientService.update(item_value, itemValueRecipientDto);
        }
      } else {
        await itemValueRecipientService.deleteAll(item_value);
      }

      const itemValueTimeSplitDtos = itemValueDto.item_value_time_splits;

      if (itemValueTimeSplitDtos.length > 0) {
        if (!channel.has_value_time_splits) {
          const channelService = new ChannelService();
          await channelService.update(channel.id, {
            has_value_time_splits: true,
            medium_id: channel.medium_id, // needed to avoid nulling out medium_id
          });
        }

        for (const itemValueTimeSplitDto of itemValueTimeSplitDtos) {
          const item_value_time_split = await itemValueTimeSplitService.update(
            item_value,
            itemValueTimeSplitDto.meta
          );

          const itemValueTimeSplitRecipientDtos =
            itemValueTimeSplitDto.item_value_time_splits_recipients;
          if (itemValueTimeSplitRecipientDtos.length > 0) {
            for (const itemValueTimeSplitRecipientDto of itemValueTimeSplitRecipientDtos) {
              await itemValueTimeSplitRecipientService.update(
                item_value_time_split,
                itemValueTimeSplitRecipientDto
              );
            }
          } else {
            await itemValueTimeSplitRecipientService.deleteAll(item_value_time_split);
          }

          const itemValueTimeSplitRemoteItemDto =
            itemValueTimeSplitDto.item_value_time_splits_remote_item;
          if (itemValueTimeSplitRemoteItemDto) {
            if (!hasValidFeedUuid(itemValueTimeSplitRemoteItemDto)) {
              continue;
            }
            await itemValueTimeSplitRemoteItemService.update(
              item_value_time_split,
              itemValueTimeSplitRemoteItemDto
            );
          } else {
            await itemValueTimeSplitRemoteItemService.deleteAll(item_value_time_split);
          }
        }
      } else {
        await itemValueTimeSplitService.deleteAll(item_value);
      }
    }
  } else {
    await itemValueService.deleteAll(item);
  }
};

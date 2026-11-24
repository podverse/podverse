import type { Episode } from 'podverse-partytime/core';

import { hasValidFeedUuid } from '@podverse/helpers';
import type { Channel, EntityManager, Item } from '@podverse/orm';
import {
  ChannelService,
  ItemValueRecipientService,
  ItemValueService,
  ItemValueTimeSplitRecipientService,
  ItemValueTimeSplitRemoteItemService,
  ItemValueTimeSplitService,
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

  if (itemValueDtos.length === 0) {
    await itemValueService.deleteAll(item);
    return;
  }

  const savedValues = await itemValueService.updateMany(
    item,
    itemValueDtos.map((itemValueDto) => itemValueDto.item_value)
  );
  const itemValueRecipientService = new ItemValueRecipientService(transactionalEntityManager);
  const itemValueTimeSplitService = new ItemValueTimeSplitService(transactionalEntityManager);
  const itemValueTimeSplitRecipientService = new ItemValueTimeSplitRecipientService(
    transactionalEntityManager
  );
  const itemValueTimeSplitRemoteItemService = new ItemValueTimeSplitRemoteItemService(
    transactionalEntityManager
  );

  for (const itemValueDto of itemValueDtos) {
    const item_value = savedValues.find(
      (saved) =>
        saved.type === itemValueDto.item_value.type &&
        saved.method === itemValueDto.item_value.method
    );
    if (item_value === undefined) {
      continue;
    }

    await itemValueRecipientService.updateMany(item_value, itemValueDto.item_value_recipients);

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
};

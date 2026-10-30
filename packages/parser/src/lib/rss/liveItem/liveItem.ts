import { loggerService } from '@parser/factories/loggerService.js';
import { timerManager } from '@parser/factories/timerManager.js';
import type { DescriptionIngestContext } from '@parser/lib/rss/descriptionIngestContext.js';
import type { ItemTimerAccumulator } from '@parser/lib/rss/item/item.js';
import { createItemTimerAccumulator, handleParsedItem } from '@parser/lib/rss/item/item.js';
import { dedupeByStableKey, getParsedItemStableKey } from '@parser/lib/rss/itemStableKey.js';
import { markChannelMayHaveLiveItems } from '@parser/lib/rss/liveItem/channelLiveItemFlag.js';
import { resolveLiveItemsLeavingFeed } from '@parser/lib/rss/liveItem/liveItemArchive.js';
import type { Episode } from 'podverse-partytime';
import type { Phase4PodcastLiveItem } from 'podverse-partytime/dist/parser/phase/phase-4.js';

import { chunkArray, getLiveItemStatusEnumValue, LiveItemStatusEnum } from '@podverse/helpers';
import type { Channel, ChannelSeasonIndex, EntityManager, LiveItem } from '@podverse/orm';
import {
  AppDataSourceReadWrite,
  ChannelService,
  ItemService,
  LiveItemService,
} from '@podverse/orm';
import { ItemFlagStatusStatusEnum } from '@podverse/orm';
import type { CompatLiveItemDto } from '@podverse/parser-mapping';
import { compatLiveItemsDtos } from '@podverse/parser-mapping';

export type HandleParsedLiveItemsResult = {
  /** GUIDs of live items that are new or changed to "pending" status */
  pendingItemGuids: string[];
  /** GUIDs of live items that are new or changed to "live" status */
  liveItemGuids: string[];
};

type LiveItemObjDto = CompatLiveItemDto;

const dedupeLiveItemObjDtos = (
  liveItemObjDtos: LiveItemObjDto[],
  itemKeysToSkip: Set<string>
): LiveItemObjDto[] => {
  return dedupeByStableKey(
    liveItemObjDtos,
    (liveItemObjDto) => getParsedItemStableKey(liveItemObjDto.item),
    itemKeysToSkip
  );
};

const processLiveItemBatch = async (
  liveItemObjDtosBatch: LiveItemObjDto[],
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex,
  descriptionContext: DescriptionIngestContext,
  existingLiveItemMap: Map<string, LiveItem>,
  updatedLiveItemIds: number[],
  pendingItemGuids: string[],
  liveItemGuids: string[],
  transactionalEntityManager: EntityManager,
  timerAccumulator: ItemTimerAccumulator,
  liveItemService: LiveItemService
) => {
  for (const liveItemObjDto of liveItemObjDtosBatch) {
    const itemDto = liveItemObjDto.item;

    const item = await handleParsedItem({
      parsedItem: itemDto as Episode,
      channel,
      channelSeasonIndex,
      descriptionContext,
      transactionalEntityManager,
      timerAccumulator,
      isLiveItem: true,
    });

    updatedLiveItemIds.push(item.id);

    const existingLiveItem = existingLiveItemMap.get(itemDto.guid);
    const newStatusEnum = getLiveItemStatusEnumValue(itemDto.status);

    // Determine if we should send a notification based on status changes
    // Send notifications when:
    // 1. New live item with pending or live status
    // 2. Existing live item that changed to pending or live status
    const isNewLiveItem = !existingLiveItem;
    const previousStatus = existingLiveItem?.live_item_status_id;
    const statusChanged = previousStatus !== newStatusEnum;

    if (newStatusEnum === LiveItemStatusEnum.Pending) {
      // Send pending notification if new or status changed to pending
      if (isNewLiveItem || statusChanged) {
        pendingItemGuids.push(itemDto.guid);
      }
    } else if (newStatusEnum === LiveItemStatusEnum.Live) {
      // Send live notification if new or status changed to live
      if (isNewLiveItem || statusChanged) {
        liveItemGuids.push(itemDto.guid);
      }
    }
    // No notification for "ended" status

    const liveItemDto = liveItemObjDto.liveItem;
    await liveItemService.update(item, liveItemDto);
  }
};

const logTimerAccumulator = (timerAccumulator: Record<string, number>) => {
  if (timerManager.shouldLogTimer) {
    Object.entries(timerAccumulator).forEach(([key, value]) => {
      loggerService.info(`${key} took ${value}ms`);
    });
  }
};

export const handleParsedLiveItems = async (
  parsedLiveItems: Phase4PodcastLiveItem[],
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex,
  descriptionContext: DescriptionIngestContext,
  itemKeysToSkip: Set<string> = new Set(),
  regularUpdatedItemIds: readonly number[] = []
): Promise<HandleParsedLiveItemsResult> => {
  const itemService = new ItemService();
  const liveItemService = new LiveItemService();
  const existingLiveItems = await liveItemService.getManyByChannel(channel, {
    relations: { item: true, live_item_status: true },
  });
  const existingLiveItemMap: Map<string, LiveItem> = new Map(
    existingLiveItems
      .filter((live_item) => live_item.item.guid !== null)
      .map((live_item) => [live_item.item.guid ?? '', live_item])
  );
  const updatedLiveItemItemIds: number[] = [];
  const pendingItemGuids: string[] = [];
  const liveItemGuids: string[] = [];
  const liveItemObjDtos = dedupeLiveItemObjDtos(
    compatLiveItemsDtos(parsedLiveItems),
    itemKeysToSkip
  );

  const timerAccumulator = createItemTimerAccumulator();

  await markChannelMayHaveLiveItems(channel, liveItemObjDtos.length, new ChannelService());

  const liveItemObjDtosBatchs = chunkArray(liveItemObjDtos, 50);
  for (const liveItemObjDtosBatch of liveItemObjDtosBatchs) {
    await AppDataSourceReadWrite.manager.transaction(async (transactionalEntityManager) => {
      await processLiveItemBatch(
        liveItemObjDtosBatch,
        channel,
        channelSeasonIndex,
        descriptionContext,
        existingLiveItemMap,
        updatedLiveItemItemIds,
        pendingItemGuids,
        liveItemGuids,
        transactionalEntityManager,
        timerAccumulator,
        liveItemService
      );
    });
  }

  logTimerAccumulator(timerAccumulator);

  const skippedGuids = new Set<string>();
  for (const parsedLiveItem of parsedLiveItems) {
    if (getLiveItemStatusEnumValue(parsedLiveItem.status ?? null) !== null) {
      continue;
    }
    if (parsedLiveItem.guid.length > 0) {
      skippedGuids.add(parsedLiveItem.guid);
    }
  }

  const { itemIdsToArchive, itemIdsToMarkEnded } = resolveLiveItemsLeavingFeed({
    existing: existingLiveItems.map((liveItem) => ({
      guid: liveItem.item.guid ?? null,
      itemId: liveItem.item.id,
      statusId: liveItem.live_item_status_id,
    })),
    liveUpdatedItemIds: updatedLiveItemItemIds,
    skippedGuids,
    regularUpdatedItemIds,
  });
  await liveItemService.markEndedByItemIds(itemIdsToMarkEnded);
  const itemsToArchive = existingLiveItems
    .filter((liveItem) => itemIdsToArchive.includes(liveItem.item.id))
    .map((liveItem) => liveItem.item);
  await itemService.updateManyFlagStatus(itemsToArchive, ItemFlagStatusStatusEnum.PendingArchive);

  return { pendingItemGuids, liveItemGuids };
};

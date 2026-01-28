import { Phase4PodcastLiveItem } from 'podverse-partytime/dist/parser/phase/phase-4';
import { chunkArray } from '@podverse/helpers';
import {
  AppDataSourceReadWrite,
  Channel,
  ChannelSeasonIndex,
  getLiveItemStatusEnumValue,
  ItemService,
  LiveItemService,
  LiveItemStatusEnum,
  LiveItem,
} from '@podverse/orm';
import { compatLiveItemsDtos } from '@parser/lib/compat/partytime/liveItem';
import { createItemTimerAccumulator, handleParsedItem } from '@parser/lib/rss/item/item';
import { ItemFlagStatusStatusEnum } from '@podverse/orm';
import { timerManager } from '@parser/factories/timerManager';
import { loggerService } from '@parser/factories/loggerService';

export type HandleParsedLiveItemsResult = {
  /** GUIDs of live items that are new or changed to "pending" status */
  pendingItemGuids: string[];
  /** GUIDs of live items that are new or changed to "live" status */
  liveItemGuids: string[];
};

type LiveItemObjDto = {
  item: Phase4PodcastLiveItem;
  // TODO: how to replace this any?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  liveItem: any; // Replace with the correct type if available
};

const processLiveItemBatch = async (
  liveItemObjDtosBatch: LiveItemObjDto[],
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex,
  existingLiveItemMap: Map<string, LiveItem>,
  updatedLiveItemIds: number[],
  pendingItemGuids: string[],
  liveItemGuids: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionalEntityManager: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timerAccumulator: any,
  liveItemService: LiveItemService
) => {
  for (const liveItemObjDto of liveItemObjDtosBatch) {
    const itemDto = liveItemObjDto.item;

    const item = await handleParsedItem({
      parsedItem: itemDto,
      channel,
      channelSeasonIndex,
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
  channelSeasonIndex: ChannelSeasonIndex
): Promise<HandleParsedLiveItemsResult> => {
  const itemService = new ItemService();
  const liveItemService = new LiveItemService();
  const existingLiveItems = await liveItemService.getManyByChannel(channel, {
    relations: ['item', 'live_item_status'],
  });
  const existingLiveItemMap: Map<string, LiveItem> = new Map(
    existingLiveItems
      .filter((live_item) => live_item.item.guid !== null)
      .map((live_item) => [live_item.item.guid ?? '', live_item])
  );
  const existingLiveItemItemIds = existingLiveItems.map((live_item) => live_item.item.id);
  const updatedLiveItemItemIds: number[] = [];
  const pendingItemGuids: string[] = [];
  const liveItemGuids: string[] = [];
  const liveItemObjDtos = compatLiveItemsDtos(parsedLiveItems);

  const timerAccumulator = createItemTimerAccumulator();

  const liveItemObjDtosBatchs = chunkArray(liveItemObjDtos, 50);
  for (const liveItemObjDtosBatch of liveItemObjDtosBatchs) {
    await AppDataSourceReadWrite.manager.transaction(async (transactionalEntityManager) => {
      await processLiveItemBatch(
        liveItemObjDtosBatch,
        channel,
        channelSeasonIndex,
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

  const itemIdsToDelete = existingLiveItemItemIds.filter(
    (id) => !updatedLiveItemItemIds.includes(id)
  );
  const itemsToDelete = existingLiveItems
    .filter((liveItem) => itemIdsToDelete.includes(liveItem.item.id))
    .map((liveItem) => liveItem.item);
  await itemService.updateManyFlagStatus(itemsToDelete, ItemFlagStatusStatusEnum.PendingArchive);

  return { pendingItemGuids, liveItemGuids };
};

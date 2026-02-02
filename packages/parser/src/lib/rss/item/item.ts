import type { Episode } from 'podverse-partytime';
import { chunkArray, DATABASE_CONSTANTS, formatGuidEnclosureUrl } from '@podverse/helpers';
import type { Channel, ChannelSeasonIndex } from '@podverse/orm';
import { AppDataSourceReadWrite, ItemService } from '@podverse/orm';
import { compatItemDto } from '@parser/lib/compat/partytime/item.js';
import { handleParsedItemAbout } from '@parser/lib/rss/item/itemAbout.js';
import { handleParsedItemChaptersFeed } from '@parser/lib/rss/item/itemChaptersFeed.js';
import { handleParsedItemDescription } from '@parser/lib/rss/item/itemDescription.js';
import { handleParsedItemEnclosure } from '@parser/lib/rss/item/itemEnclosure.js';
import { handleParsedItemImage } from '@parser/lib/rss/item/itemImage.js';
import { handleParsedItemLicense } from '@parser/lib/rss/item/itemLicense.js';
import { handleParsedItemLocation } from '@parser/lib/rss/item/itemLocation.js';
import { handleParsedItemPerson } from '@parser/lib/rss/item/itemPerson.js';
import { handleParsedItemSeason } from '@parser/lib/rss/item/itemSeason.js';
import { handleParsedItemSeasonEpisode } from '@parser/lib/rss/item/itemSeasonEpisode.js';
import { handleParsedItemSocialInteract } from '@parser/lib/rss/item/itemSocialInteract.js';
import { handleParsedItemSoundbite } from '@parser/lib/rss/item/itemSoundbite.js';
import { handleParsedItemTranscript } from '@parser/lib/rss/item/itemTranscript.js';
import { handleParsedItemTxt } from '@parser/lib/rss/item/itemTxt.js';
import { handleParsedItemValue } from '@parser/lib/rss/item/itemValue.js';
import { handleParsedItemChat } from '@parser/lib/rss/item/itemChat.js';
import { ItemFlagStatusStatusEnum } from '@podverse/orm';
import { timerManager } from '@parser/factories/timerManager.js';
import { loggerService } from '@parser/factories/loggerService.js';

const removeInvalidItems = (parsedItems: Episode[]): Episode[] => {
  const seenEnclosureUrls = new Set<string>();
  const seenGuids = new Set<string>();
  const validUrlPattern = /^https?:\/\//;

  return parsedItems.reduce((acc, parsedItem) => {
    const enclosureUrl = parsedItem.enclosure.url.slice(0, DATABASE_CONSTANTS.varchar_url);
    const guid = parsedItem.guid;

    if (!validUrlPattern.test(enclosureUrl)) {
      return acc;
    }

    if (!seenEnclosureUrls.has(enclosureUrl) && !seenGuids.has(guid)) {
      seenEnclosureUrls.add(enclosureUrl);
      seenGuids.add(guid);
      acc.push(parsedItem);
    }
    return acc;
  }, [] as Episode[]);
};

type ItemTimerAccumulator = {
  updateItem: number;
  handleParsedItemAbout: number;
  handleParsedItemChaptersFeed: number;
  handleParsedItemChat: number;
  handleParsedItemDescription: number;
  handleParsedItemEnclosure: number;
  handleParsedItemImage: number;
  handleParsedItemLicense: number;
  handleParsedItemLocation: number;
  handleParsedItemPerson: number;
  handleParsedItemSeason: number;
  handleParsedItemSeasonEpisode: number;
  handleParsedItemSocialInteract: number;
  handleParsedItemSoundbite: number;
  handleParsedItemTranscript: number;
  handleParsedItemTxt: number;
  handleParsedItemValue: number;
};

type HandleParsedItemBatch = {
  parsedItemBatch: Episode[];
  channel: Channel;
  channelSeasonIndex: ChannelSeasonIndex;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionalEntityManager?: any;
  updatedItemIds: number[];
  timerAccumulator: ItemTimerAccumulator;
};

type HandleParsedItem = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedItem: any;
  channel: Channel;
  channelSeasonIndex: ChannelSeasonIndex;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionalEntityManager?: any;
  timerAccumulator: ItemTimerAccumulator;
  isLiveItem?: boolean;
};

export const createItemTimerAccumulator = (): ItemTimerAccumulator => {
  const timerAccumulator: ItemTimerAccumulator = {
    updateItem: 0,
    handleParsedItemAbout: 0,
    handleParsedItemChaptersFeed: 0,
    handleParsedItemChat: 0,
    handleParsedItemDescription: 0,
    handleParsedItemEnclosure: 0,
    handleParsedItemImage: 0,
    handleParsedItemLicense: 0,
    handleParsedItemLocation: 0,
    handleParsedItemPerson: 0,
    handleParsedItemSeason: 0,
    handleParsedItemSeasonEpisode: 0,
    handleParsedItemSocialInteract: 0,
    handleParsedItemSoundbite: 0,
    handleParsedItemTranscript: 0,
    handleParsedItemTxt: 0,
    handleParsedItemValue: 0,
  };
  return timerAccumulator;
};

export type HandleParsedItemsResult = {
  newItemGuids: string[];
  newItemGuidEnclosureUrls: string[];
};

export const handleParsedItems = async (
  parsedItems: Episode[],
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex
): Promise<HandleParsedItemsResult> => {
  const itemService = new ItemService();

  timerManager.start('getManyByChannel');
  const existingItems = await itemService.getManyByChannel(channel, {
    select: ['id', 'guid', 'guid_enclosure_url'],
  });
  timerManager.end('getManyByChannel');

  timerManager.start('existingItemIds');
  const existingItemIds: number[] = existingItems.map((item) => item.id);
  const existingItemGuids = new Set(
    existingItems.map((item) => item.guid).filter((g): g is string => g !== null)
  );
  const existingItemGuidEnclosureUrls = new Set(
    existingItems.map((item) => item.guid_enclosure_url).filter((g): g is string => g !== null)
  );
  const updatedItemIds: number[] = [];
  const newItemGuids: string[] = [];
  const newItemGuidEnclosureUrls: string[] = [];

  const uniqueParsedItems = removeInvalidItems(parsedItems);

  const parsedItemBatchs = chunkArray(uniqueParsedItems, 100);

  const timerAccumulator = createItemTimerAccumulator();
  timerManager.end('existingItemIds');

  for (const parsedItemBatch of parsedItemBatchs) {
    timerManager.start('handleParsedItemBatch');
    if (timerManager.shouldLogTimer) {
      await handleParsedItemBatch({
        parsedItemBatch,
        channel,
        channelSeasonIndex,
        updatedItemIds,
        timerAccumulator,
        newItemGuids,
        newItemGuidEnclosureUrls,
        existingItemGuids,
        existingItemGuidEnclosureUrls,
      });
    } else {
      await AppDataSourceReadWrite.manager.transaction(async (transactionalEntityManager) => {
        await handleParsedItemBatch({
          parsedItemBatch,
          channel,
          channelSeasonIndex,
          transactionalEntityManager,
          updatedItemIds,
          timerAccumulator,
          newItemGuids,
          newItemGuidEnclosureUrls,
          existingItemGuids,
          existingItemGuidEnclosureUrls,
        });
      });
    }
    timerManager.end('handleParsedItemBatch');
  }

  if (timerManager.shouldLogTimer) {
    Object.entries(timerAccumulator).forEach(([key, value]) => {
      loggerService.info(`${key} took ${value}ms`);
    });
  }

  const itemIdsToDelete = existingItemIds.filter((id) => !updatedItemIds.includes(id));
  const itemsToDelete = existingItems.filter((item) => itemIdsToDelete.includes(item.id));
  await itemService.updateManyFlagStatus(itemsToDelete, ItemFlagStatusStatusEnum.PendingArchive);

  return {
    newItemGuids,
    newItemGuidEnclosureUrls,
  };
};

const handleParsedItemBatch = async ({
  parsedItemBatch,
  channel,
  channelSeasonIndex,
  transactionalEntityManager,
  updatedItemIds,
  timerAccumulator,
  newItemGuids,
  newItemGuidEnclosureUrls,
  existingItemGuids,
  existingItemGuidEnclosureUrls,
}: HandleParsedItemBatch & {
  newItemGuids: string[];
  newItemGuidEnclosureUrls: string[];
  existingItemGuids: Set<string>;
  existingItemGuidEnclosureUrls: Set<string>;
}) => {
  for (const parsedItem of parsedItemBatch) {
    const item = await handleParsedItem({
      parsedItem,
      channel,
      channelSeasonIndex,
      transactionalEntityManager,
      timerAccumulator,
    });
    updatedItemIds.push(item.id);

    const guid = parsedItem.guid;
    const guidEnclosureUrl = formatGuidEnclosureUrl(parsedItem.enclosure.url);

    if (guid && !existingItemGuids.has(guid)) {
      newItemGuids.push(guid);
    } else if (guidEnclosureUrl && !existingItemGuidEnclosureUrls.has(guidEnclosureUrl)) {
      newItemGuidEnclosureUrls.push(guidEnclosureUrl);
    }
  }
};

export const handleParsedItem = async ({
  parsedItem,
  channel,
  channelSeasonIndex,
  transactionalEntityManager,
  timerAccumulator,
  isLiveItem,
}: HandleParsedItem) => {
  const itemService = new ItemService();
  const itemDto = compatItemDto(parsedItem, { isLiveItem: isLiveItem ?? false });

  timerManager.start('updateItem');
  const item = await itemService.update(channel, ItemFlagStatusStatusEnum.Active, itemDto);
  timerAccumulator.updateItem = timerManager.end('updateItem', true) + timerAccumulator.updateItem;

  const preventTimerLog = true;

  timerManager.start('handleParsedItemAbout');
  await handleParsedItemAbout(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemAbout =
    timerManager.end('handleParsedItemAbout', preventTimerLog) +
    timerAccumulator.handleParsedItemAbout;

  timerManager.start('handleParsedItemChapterFeed');
  await handleParsedItemChaptersFeed(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemChaptersFeed =
    timerManager.end('handleParsedItemChapterFeed', preventTimerLog) +
    timerAccumulator.handleParsedItemChaptersFeed;

  timerManager.start('handleParsedItemChat');
  await handleParsedItemChat(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemChat =
    timerManager.end('handleParsedItemChat', preventTimerLog) +
    timerAccumulator.handleParsedItemChat;

  // // PTDO: add itemContentLinkService support after partytime adds chat support
  // const itemContentLinkService = new ItemContentLinkService();
  // const itemContentLinkDtos = compatItemContentLinkDtos(parsedItem);
  // if (itemContentLinkDtos.length) {
  //   await itemContentLinkService.updateMany(item, itemContentLinkDtos);
  // } else {
  //   await itemContentLinkService._deleteAll(item);
  // }

  timerManager.start('handleParsedItemDescription');
  await handleParsedItemDescription(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemDescription =
    timerManager.end('handleParsedItemDescription', preventTimerLog) +
    timerAccumulator.handleParsedItemDescription;

  timerManager.start('handleParsedItemEnclosure');
  await handleParsedItemEnclosure(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemEnclosure =
    timerManager.end('handleParsedItemEnclosure', preventTimerLog) +
    timerAccumulator.handleParsedItemEnclosure;

  timerManager.start('handleParsedItemImage');
  await handleParsedItemImage(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemImage =
    timerManager.end('handleParsedItemImage', preventTimerLog) +
    timerAccumulator.handleParsedItemImage;

  timerManager.start('handleParsedItemLicense');
  await handleParsedItemLicense(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemLicense =
    timerManager.end('handleParsedItemLicense', preventTimerLog) +
    timerAccumulator.handleParsedItemLicense;

  timerManager.start('handleParsedItemLocation');
  await handleParsedItemLocation(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemLocation =
    timerManager.end('handleParsedItemLocation', preventTimerLog) +
    timerAccumulator.handleParsedItemLocation;

  timerManager.start('handleParsedItemPerson');
  await handleParsedItemPerson(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemPerson =
    timerManager.end('handleParsedItemPerson', preventTimerLog) +
    timerAccumulator.handleParsedItemPerson;

  timerManager.start('handleParsedItemSeason');
  await handleParsedItemSeason(parsedItem, item, channelSeasonIndex, transactionalEntityManager);
  timerAccumulator.handleParsedItemSeason =
    timerManager.end('handleParsedItemSeason', preventTimerLog) +
    timerAccumulator.handleParsedItemSeason;

  timerManager.start('handleParsedItemSeasonEpisode');
  await handleParsedItemSeasonEpisode(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemSeasonEpisode =
    timerManager.end('handleParsedItemSeasonEpisode', preventTimerLog) +
    timerAccumulator.handleParsedItemSeasonEpisode;

  timerManager.start('handleParsedItemSocialInteract');
  await handleParsedItemSocialInteract(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemSocialInteract =
    timerManager.end('handleParsedItemSocialInteract', preventTimerLog) +
    timerAccumulator.handleParsedItemSocialInteract;

  timerManager.start('handleParsedItemSoundbite');
  await handleParsedItemSoundbite(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemSoundbite =
    timerManager.end('handleParsedItemSoundbite', preventTimerLog) +
    timerAccumulator.handleParsedItemSoundbite;

  timerManager.start('handleParsedItemTranscript');
  await handleParsedItemTranscript(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemTranscript =
    timerManager.end('handleParsedItemTranscript', preventTimerLog) +
    timerAccumulator.handleParsedItemTranscript;

  timerManager.start('handleParsedItemTxt');
  await handleParsedItemTxt(parsedItem, item, transactionalEntityManager);
  timerAccumulator.handleParsedItemTxt =
    timerManager.end('handleParsedItemTxt', preventTimerLog) + timerAccumulator.handleParsedItemTxt;

  timerManager.start('handleParsedItemValue');
  await handleParsedItemValue(parsedItem, item, channel, transactionalEntityManager);
  timerAccumulator.handleParsedItemValue =
    timerManager.end('handleParsedItemValue', preventTimerLog) +
    timerAccumulator.handleParsedItemValue;

  return item;
};

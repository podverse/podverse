import type { EmbedDemoPiSeedFeedDef } from '@podverse/helpers';
import { resolveEmbedDemoPiSeedItemSelection, SharableStatusEnum } from '@podverse/helpers';
import type { Channel, ClipService, Item, ItemService } from '@podverse/orm';
import { ItemChapterService } from '@podverse/orm';
import { parseChapters } from '@podverse/parser';

export const EMBED_DEMO_SAMPLE_CLIP_TITLE = 'Sample Clip';
export const EMBED_DEMO_SAMPLE_CLIP_DURATION_SECONDS = 90;
export const EMBED_DEMO_SAMPLE_CLIP_START_SECONDS = 60;

/** Multiple public clips that back the `?type=clips` channel list showcase. */
export const EMBED_DEMO_LIST_CLIP_TITLE = 'Sample List Clip';
export const EMBED_DEMO_LIST_CLIP_DURATION_SECONDS = 60;
export const EMBED_DEMO_LIST_CLIP_MAX_COUNT = 4;

type LoggerService = {
  info: (message: string, meta?: unknown) => void;
};

async function resolveItemForFeedDef(
  itemService: ItemService,
  channel: Channel,
  feedDef: EmbedDemoPiSeedFeedDef
): Promise<Item | null> {
  if (feedDef.itemGuid !== undefined) {
    return itemService.getByGuid(channel, feedDef.itemGuid);
  }

  const itemSelection = resolveEmbedDemoPiSeedItemSelection(feedDef);
  if (itemSelection === 'latest-video') {
    return itemService.getLatestPublishedVideoItemByChannelId(channel.id);
  }

  return itemService.getLatestPublishedItemByChannelId(channel.id);
}

async function resolveItemWithChaptersFeed(
  itemService: ItemService,
  channel: Channel
): Promise<Item | null> {
  const items = await itemService.getManyByChannel(channel, {
    order: { pub_date: 'DESC' },
    take: 25,
  });

  for (const candidate of items) {
    if (candidate.id_text === null || candidate.id_text === undefined) {
      continue;
    }

    const item = await itemService.getByIdOrIdText(candidate.id_text, {
      item_chapters_feed: true,
    });
    if (item?.item_chapters_feed !== null && item?.item_chapters_feed !== undefined) {
      return item;
    }
  }

  return null;
}

async function ensureSampleClip(params: {
  clipService: ClipService;
  accountId: number;
  item: Item;
}): Promise<string> {
  const { clipService, accountId, item } = params;
  if (item.id_text === null || item.id_text === undefined) {
    throw new Error('Cannot create Sample Clip without item id_text.');
  }

  const existingClips = await clipService.getManyByAccount(accountId);
  const existing = existingClips.find(
    (clip) => clip.title === EMBED_DEMO_SAMPLE_CLIP_TITLE && clip.item_id === item.id_text
  );

  const startSeconds = EMBED_DEMO_SAMPLE_CLIP_START_SECONDS;
  const endSeconds = startSeconds + EMBED_DEMO_SAMPLE_CLIP_DURATION_SECONDS;
  const clipDto = {
    start_time: String(startSeconds),
    end_time: String(endSeconds),
    title: EMBED_DEMO_SAMPLE_CLIP_TITLE,
    description: 'Embed demo sample clip.',
    item_id_text: item.id_text,
    sharable_status_id: SharableStatusEnum.Public,
  };

  if (existing?.id_text !== null && existing?.id_text !== undefined) {
    const updated = await clipService.update(accountId, existing.id_text, clipDto);
    if (updated.id_text === null || updated.id_text === undefined) {
      throw new Error('Updated Sample Clip is missing id_text.');
    }
    return updated.id_text;
  }

  const created = await clipService.create(accountId, clipDto);
  if (created.id_text === null || created.id_text === undefined) {
    throw new Error('Created Sample Clip is missing id_text.');
  }

  return created.id_text;
}

/**
 * Creates/updates several public clips (owned by the embed demo system account) across the
 * channel's recent items so the `?type=clips` list shows multiple rows. Idempotent: clips are
 * matched by `(title, item_id)` like {@link ensureSampleClip}.
 */
export async function seedSampleClipsForChannel(params: {
  clipService: ClipService;
  accountId: number;
  itemService: ItemService;
  channel: Channel;
}): Promise<number> {
  const { clipService, accountId, itemService, channel } = params;

  const items = await itemService.getManyByChannel(channel, {
    order: { pub_date: 'DESC' },
    take: EMBED_DEMO_LIST_CLIP_MAX_COUNT,
  });

  const existingClips = await clipService.getManyByAccount(accountId);

  const startSeconds = EMBED_DEMO_SAMPLE_CLIP_START_SECONDS;
  const endSeconds = startSeconds + EMBED_DEMO_LIST_CLIP_DURATION_SECONDS;

  let seededCount = 0;

  for (const item of items) {
    if (item.id_text === null || item.id_text === undefined) {
      continue;
    }

    const clipDto = {
      start_time: String(startSeconds),
      end_time: String(endSeconds),
      title: EMBED_DEMO_LIST_CLIP_TITLE,
      description: 'Embed demo sample list clip.',
      item_id_text: item.id_text,
      sharable_status_id: SharableStatusEnum.Public,
    };

    const existing = existingClips.find(
      (clip) => clip.title === EMBED_DEMO_LIST_CLIP_TITLE && clip.item_id === item.id_text
    );

    if (existing?.id_text !== null && existing?.id_text !== undefined) {
      await clipService.update(accountId, existing.id_text, clipDto);
    } else {
      await clipService.create(accountId, clipDto);
    }

    seededCount += 1;
  }

  return seededCount;
}

/**
 * Resolves a chapter-bearing item on the channel, parses + persists its chapters, and returns
 * its `id_text` for the `episode-chapters` list showcase. Throws when no chapters resolve.
 */
export async function resolveChaptersListItemIdText(
  itemService: ItemService,
  channel: Channel
): Promise<string> {
  const item = await resolveItemWithChaptersFeed(itemService, channel);
  if (item === null || item.id_text === null || item.id_text === undefined) {
    throw new Error(
      `Cannot seed episode-chapters list showcase for channel ${channel.id_text}: no chapter-bearing item found.`
    );
  }

  const loaded = await itemService.getByIdOrIdText(item.id_text, {
    item_chapters_feed: true,
  });
  if (loaded === null || loaded.id_text === null || loaded.id_text === undefined) {
    throw new Error(
      `Cannot seed episode-chapters list showcase for channel ${channel.id_text}: chapter item not found.`
    );
  }

  const parseResult = await parseChapters(loaded);
  if (
    !parseResult.parsed ||
    loaded.item_chapters_feed === null ||
    loaded.item_chapters_feed === undefined
  ) {
    throw new Error(
      `Cannot seed episode-chapters list showcase for channel ${channel.id_text}: chapters did not parse.`
    );
  }

  const itemChapterService = new ItemChapterService();
  const chapters = await itemChapterService.getAll(loaded.item_chapters_feed, {
    order: { start_time: 'ASC' },
  });

  if (chapters.length === 0) {
    throw new Error(
      `Cannot seed episode-chapters list showcase for channel ${channel.id_text}: no parsed chapters found.`
    );
  }

  return loaded.id_text;
}

async function resolveMiddleChapterIdText(item: Item): Promise<string | null> {
  const parseResult = await parseChapters(item);
  if (
    !parseResult.parsed ||
    item.item_chapters_feed === null ||
    item.item_chapters_feed === undefined
  ) {
    return null;
  }

  const itemChapterService = new ItemChapterService();
  const chapters = await itemChapterService.getAll(item.item_chapters_feed, {
    order: { start_time: 'ASC' },
  });

  if (chapters.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(chapters.length / 2);
  const middleChapter = chapters[middleIndex];
  if (
    middleChapter === undefined ||
    middleChapter.id_text === null ||
    middleChapter.id_text === undefined
  ) {
    return null;
  }

  return middleChapter.id_text;
}

export async function seedEmbedDemoClipAndChapterShowcases(params: {
  feedDef: EmbedDemoPiSeedFeedDef;
  channel: Channel;
  embedDemoAccountId: number;
  itemService: ItemService;
  clipService: ClipService;
  upsertShowcase: (
    showcaseId: string,
    resourceIdText: string,
    playResourceIdText?: string | null
  ) => Promise<void>;
  logger: LoggerService;
}): Promise<void> {
  const { feedDef, channel, embedDemoAccountId, itemService, clipService, upsertShowcase, logger } =
    params;

  if (
    feedDef.seedClipShowcaseId === undefined &&
    feedDef.seedChapterShowcaseId === undefined &&
    feedDef.clipsListShowcaseId === undefined &&
    feedDef.chaptersListShowcaseId === undefined
  ) {
    return;
  }

  const clipItem = await resolveItemForFeedDef(itemService, channel, feedDef);
  if (clipItem === null || clipItem.id_text === null || clipItem.id_text === undefined) {
    throw new Error(
      `Cannot seed clip showcase for channel ${channel.id_text}: no item resolved from feed def.`
    );
  }

  if (feedDef.seedClipShowcaseId !== undefined) {
    const clipIdText = await ensureSampleClip({
      clipService,
      accountId: embedDemoAccountId,
      item: clipItem,
    });

    await upsertShowcase(feedDef.seedClipShowcaseId, clipIdText);
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${feedDef.seedClipShowcaseId}=${clipIdText} (${EMBED_DEMO_SAMPLE_CLIP_TITLE}).`
    );
  }

  if (feedDef.seedChapterShowcaseId !== undefined) {
    const chapterItem = (await resolveItemWithChaptersFeed(itemService, channel)) ?? clipItem;
    if (chapterItem.id_text === null || chapterItem.id_text === undefined) {
      throw new Error(
        `Cannot seed chapter showcase for channel ${channel.id_text}: chapter item missing id_text.`
      );
    }

    const chapterItemLoaded = await itemService.getByIdOrIdText(chapterItem.id_text, {
      item_chapters_feed: true,
    });

    if (chapterItemLoaded === null) {
      throw new Error(
        `Cannot seed chapter showcase for channel ${channel.id_text}: chapter item not found.`
      );
    }

    const chapterIdText = await resolveMiddleChapterIdText(chapterItemLoaded);
    if (chapterIdText === null) {
      throw new Error(
        `Cannot seed chapter showcase for channel ${channel.id_text}: no parsed chapters found.`
      );
    }

    await upsertShowcase(feedDef.seedChapterShowcaseId, chapterIdText);
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${feedDef.seedChapterShowcaseId}=${chapterIdText}.`
    );
  }

  if (feedDef.clipsListShowcaseId !== undefined) {
    if (channel.id_text === null || channel.id_text === undefined) {
      throw new Error(
        `Cannot seed clips list showcase for channel ${channel.id}: missing channel id_text.`
      );
    }

    const seededCount = await seedSampleClipsForChannel({
      clipService,
      accountId: embedDemoAccountId,
      itemService,
      channel,
    });

    await upsertShowcase(feedDef.clipsListShowcaseId, channel.id_text);
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${feedDef.clipsListShowcaseId}=${channel.id_text} (${seededCount} sample list clip(s)).`
    );
  }

  if (feedDef.chaptersListShowcaseId !== undefined) {
    const chaptersItemIdText = await resolveChaptersListItemIdText(itemService, channel);

    await upsertShowcase(feedDef.chaptersListShowcaseId, chaptersItemIdText);
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${feedDef.chaptersListShowcaseId}=${chaptersItemIdText}.`
    );
  }
}

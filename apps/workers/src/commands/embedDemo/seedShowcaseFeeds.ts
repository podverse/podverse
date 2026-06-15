import type { CommandLineArgs } from '@workers/commands/index.js';
import { parsePodcastIndexFeedDirectly } from '@workers/commands/parser/rss/parseFeed.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import type { EmbedDemoPiSeedFeedDef } from '@podverse/helpers';
import {
  EMBED_DEMO_PI_SEED_FEEDS,
  getEmbedDemoPiSeedManagedShowcaseIds,
  resolveEmbedDemoPiSeedItemSelection,
} from '@podverse/helpers';
import type { Channel, Item } from '@podverse/orm';
import {
  AccountService,
  ChannelService,
  ClipService,
  EmbedDemoConfigService,
  EmbedDemoConfigValidationError,
  FeedService,
  ItemService,
} from '@podverse/orm';

import { ensureEmbedDemoSystemAccount } from './ensureEmbedDemoSystemAccount.js';
import { seedEmbedDemoClipAndChapterShowcases } from './seedShowcaseClipChapterHelpers.js';
import {
  feedDefRequiresItem,
  shouldContinueSeedAfterParseFailure,
} from './seedShowcaseFeedHelpers.js';

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

type LoggerService = ReturnType<typeof getLoggerService>;

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

/**
 * Resolves the default play item id_text for a list showcase from
 * `channelPlayItemGuid`. Returns `null` when the feed pins no play item so the
 * re-seed clears any stale value; throws when a pinned guid cannot be found.
 */
async function resolveChannelPlayItemIdText(
  itemService: ItemService,
  channel: Channel,
  feedDef: EmbedDemoPiSeedFeedDef
): Promise<string | null> {
  if (feedDef.channelPlayItemGuid === undefined) {
    return null;
  }

  const playItem = await itemService.getByGuid(channel, feedDef.channelPlayItemGuid);
  if (playItem === null || playItem.id_text === null || playItem.id_text === undefined) {
    throw new Error(
      `No item with guid ${feedDef.channelPlayItemGuid} found for channel ${channel.id_text} (podcast_index_id=${feedDef.podcastIndexId})`
    );
  }

  return playItem.id_text;
}

async function upsertShowcaseWithOverwriteLog(
  embedDemoConfigService: EmbedDemoConfigService,
  logger: LoggerService,
  showcaseResourceById: Map<string, string | null>,
  showcaseId: string,
  resourceIdText: string,
  playResourceIdText?: string | null
): Promise<void> {
  const previousResourceIdText = showcaseResourceById.get(showcaseId) ?? null;

  if (previousResourceIdText !== null && previousResourceIdText !== resourceIdText) {
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Overwriting showcase row ${showcaseId}: ${previousResourceIdText} -> ${resourceIdText}.`
    );
  }

  await embedDemoConfigService.upsertShowcase(showcaseId, resourceIdText, playResourceIdText);
  showcaseResourceById.set(showcaseId, resourceIdText);
}

async function seedSingleEmbedDemoPiFeed(params: {
  feedDef: EmbedDemoPiSeedFeedDef;
  feedService: FeedService;
  channelService: ChannelService;
  itemService: ItemService;
  embedDemoAccountId: number;
  clipService: ClipService;
  embedDemoConfigService: EmbedDemoConfigService;
  showcaseResourceById: Map<string, string | null>;
  logger: LoggerService;
}): Promise<void> {
  const {
    feedDef,
    feedService,
    channelService,
    itemService,
    embedDemoAccountId,
    clipService,
    embedDemoConfigService,
    showcaseResourceById,
    logger,
  } = params;

  const existingFeed = await feedService.getByPodcastIndexId(feedDef.podcastIndexId);
  const feedExistedBeforeParse = existingFeed !== null;

  logger.info(
    `[seedEmbedDemoShowcaseFeeds] ${feedExistedBeforeParse ? 'Re-parsing existing' : 'Parsing new'} feed ${feedDef.title} (podcast_index_id=${feedDef.podcastIndexId}).`
  );

  try {
    await parsePodcastIndexFeedDirectly(feedDef.podcastIndexId, true, {
      enqueueFollowUpWork: false,
    });
  } catch (error) {
    if (!shouldContinueSeedAfterParseFailure(feedExistedBeforeParse)) {
      throw error;
    }

    logger.warn(
      `[seedEmbedDemoShowcaseFeeds] Parse failed for existing feed ${feedDef.title} (podcast_index_id=${feedDef.podcastIndexId}); continuing with current DB state.`,
      normalizeError(error)
    );
  }

  const channel = await channelService.getByPodcastIndexId(feedDef.podcastIndexId);
  if (channel === null || channel.id_text === null || channel.id_text === undefined) {
    throw new Error(`Channel not found after parse for podcast_index_id ${feedDef.podcastIndexId}`);
  }

  if (feedDef.channelShowcaseId !== undefined) {
    const channelPlayItemIdText = await resolveChannelPlayItemIdText(itemService, channel, feedDef);

    await upsertShowcaseWithOverwriteLog(
      embedDemoConfigService,
      logger,
      showcaseResourceById,
      feedDef.channelShowcaseId,
      channel.id_text,
      channelPlayItemIdText
    );

    if (channelPlayItemIdText !== null) {
      logger.info(
        `[seedEmbedDemoShowcaseFeeds] Set ${feedDef.channelShowcaseId} default play item=${channelPlayItemIdText}.`
      );
    }
  }

  if (feedDefRequiresItem(feedDef)) {
    const item = await resolveItemForFeedDef(itemService, channel, feedDef);
    if (item === null || item.id_text === null || item.id_text === undefined) {
      const reason =
        feedDef.itemGuid !== undefined
          ? `No item with guid ${feedDef.itemGuid} found`
          : 'No published item found';
      throw new Error(
        `${reason} for channel ${channel.id_text} (podcast_index_id=${feedDef.podcastIndexId})`
      );
    }

    await upsertShowcaseWithOverwriteLog(
      embedDemoConfigService,
      logger,
      showcaseResourceById,
      feedDef.itemShowcaseId,
      item.id_text
    );

    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${formatFeedDefSummary(feedDef, channel, item)}.`
    );
  } else {
    logger.info(
      `[seedEmbedDemoShowcaseFeeds] Configured ${feedDef.channelShowcaseId}=${channel.id_text}.`
    );
  }

  await seedEmbedDemoClipAndChapterShowcases({
    feedDef,
    channel,
    embedDemoAccountId,
    itemService,
    clipService,
    upsertShowcase: async (showcaseId, resourceIdText, playResourceIdText) => {
      await upsertShowcaseWithOverwriteLog(
        embedDemoConfigService,
        logger,
        showcaseResourceById,
        showcaseId,
        resourceIdText,
        playResourceIdText
      );
    },
    logger,
  });
}

function formatFeedDefSummary(
  feedDef: EmbedDemoPiSeedFeedDef,
  channel: Channel,
  latestItem: Item
): string {
  const parts: string[] = [];

  if (feedDef.channelShowcaseId !== undefined) {
    parts.push(`${feedDef.channelShowcaseId}=${channel.id_text}`);
  }

  if (feedDef.itemShowcaseId !== undefined) {
    parts.push(
      `${feedDef.itemShowcaseId}=${latestItem.id_text} (${latestItem.title ?? 'untitled'})`
    );
  }

  return parts.join(', ');
}

/**
 * Parses Podcast Index showcase feeds directly (no RSS queue), then upserts
 * embed_demo_showcase rows for seed-managed slots (channels and/or latest items).
 *
 * Idempotent: existing feeds are identified by podcast_index_id, always re-parsed,
 * and showcase rows are overwritten every run.
 *
 * Clip/chapter showcase slots on podcast-audio and podcast-video feeds are seeded here
 * (Sample Clip + middle parsed chapter). Official-clip and playlist slots stay admin-managed.
 */
export async function seedEmbedDemoShowcaseFeeds(_args: CommandLineArgs): Promise<void> {
  const logger = getLoggerService();
  const feedService = new FeedService();
  const channelService = new ChannelService();
  const itemService = new ItemService();
  const accountService = new AccountService();
  const clipService = new ClipService();
  const embedDemoConfigService = new EmbedDemoConfigService();
  const managedShowcaseIds = getEmbedDemoPiSeedManagedShowcaseIds();

  logger.info(
    `[seedEmbedDemoShowcaseFeeds] Seeding ${EMBED_DEMO_PI_SEED_FEEDS.length} Podcast Index feed(s) for ${managedShowcaseIds.length} embed demo showcase slot(s).`
  );

  const embedDemoAccountId = await ensureEmbedDemoSystemAccount(accountService);
  logger.info(
    `[seedEmbedDemoShowcaseFeeds] Using embed demo system account id=${embedDemoAccountId}.`
  );

  const adminSlots = await embedDemoConfigService.getAdminShowcaseSlots();
  const showcaseResourceById = new Map<string, string | null>(
    adminSlots.map((slot) => [slot.showcaseId, slot.resourceIdText])
  );

  let succeeded = 0;
  let failed = 0;

  for (const feedDef of EMBED_DEMO_PI_SEED_FEEDS) {
    try {
      await seedSingleEmbedDemoPiFeed({
        feedDef,
        feedService,
        channelService,
        itemService,
        embedDemoAccountId,
        clipService,
        embedDemoConfigService,
        showcaseResourceById,
        logger,
      });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const normalized = normalizeError(error);
      if (error instanceof EmbedDemoConfigValidationError) {
        logger.error(
          `[seedEmbedDemoShowcaseFeeds] Validation failed for ${feedDef.title} (podcast_index_id=${feedDef.podcastIndexId}): ${normalized.message}`
        );
      } else {
        logger.error(
          `[seedEmbedDemoShowcaseFeeds] Failed ${feedDef.title} (podcast_index_id=${feedDef.podcastIndexId}).`,
          normalized
        );
      }
    }
  }

  logger.info(
    `[seedEmbedDemoShowcaseFeeds] Done. Succeeded: ${succeeded}, failed: ${failed}, total: ${EMBED_DEMO_PI_SEED_FEEDS.length}.`
  );

  if (failed > 0) {
    throw new Error(
      `[seedEmbedDemoShowcaseFeeds] ${failed} of ${EMBED_DEMO_PI_SEED_FEEDS.length} feed(s) failed.`
    );
  }
}

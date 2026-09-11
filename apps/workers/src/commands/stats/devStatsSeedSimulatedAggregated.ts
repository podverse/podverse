import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import type { SimulatedAggregatedCounts } from '@podverse/helpers';
import {
  buildSimulatedChannelAggregatedCounts,
  buildSimulatedItemAggregatedCounts,
  SIMULATED_STATS_ITEMS_PER_CHANNEL,
} from '@podverse/helpers';
import {
  AccountService,
  ChannelService,
  ClipService,
  ItemService,
  PlaylistService,
  StatsAggregatedAccountService,
  StatsAggregatedChannelService,
  StatsAggregatedClipService,
  StatsAggregatedItemService,
  StatsAggregatedPlaylistService,
} from '@podverse/orm';

const HARD_MAX_ITEMS_PER_CHANNEL = 80;
const PUBLIC_LIST_TAKE = 5000;

function parsePositiveInt(raw: string | string[] | undefined, fallback: number): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

async function seedRankedPublicEntities(
  entities: { id: number }[],
  upsert: (id: number, counts: SimulatedAggregatedCounts) => Promise<void>
): Promise<number> {
  let rows = 0;
  for (let rank = 0; rank < entities.length; rank += 1) {
    const entity = entities[rank];
    if (entity === undefined) {
      continue;
    }
    await upsert(
      entity.id,
      buildSimulatedChannelAggregatedCounts({
        entityId: entity.id,
        rank,
        total: entities.length,
      })
    );
    rows += 1;
  }
  return rows;
}

export async function devStatsSeedSimulatedAggregated(args: CommandLineArgs) {
  const logger = getLoggerService();
  const itemsPerChannel = Math.min(
    HARD_MAX_ITEMS_PER_CHANNEL,
    parsePositiveInt(
      'itemsPerChannel' in args ? args.itemsPerChannel : args.items,
      SIMULATED_STATS_ITEMS_PER_CHANNEL
    )
  );

  const channelService = new ChannelService();
  const itemService = new ItemService();
  const clipService = new ClipService();
  const playlistService = new PlaylistService();
  const accountService = new AccountService();
  const channelStatsService = new StatsAggregatedChannelService();
  const itemStatsService = new StatsAggregatedItemService();
  const clipStatsService = new StatsAggregatedClipService();
  const playlistStatsService = new StatsAggregatedPlaylistService();
  const accountStatsService = new StatsAggregatedAccountService();

  const channels = await channelService.getMany(
    { order: { id: 'ASC' }, take: PUBLIC_LIST_TAKE },
    'all',
    null
  );

  if (channels.length === 0) {
    logger.warn(
      '[devStatsSeedSimulatedAggregated] No public parsed channels found. Parse feeds first.'
    );
    return;
  }

  logger.info(
    `[devStatsSeedSimulatedAggregated] Writing staggered stats for ${channels.length} channel(s), up to ${itemsPerChannel} newest item(s) each, plus public clips, playlists, and accounts when present.`
  );

  let channelRows = 0;
  let itemRows = 0;

  for (let rank = 0; rank < channels.length; rank += 1) {
    const channel = channels[rank];
    if (channel === undefined) {
      continue;
    }

    const channelCounts = buildSimulatedChannelAggregatedCounts({
      entityId: channel.id,
      rank,
      total: channels.length,
    });
    await channelStatsService.upsertCounts(channel.id, channelCounts);
    channelRows += 1;

    const items = await itemService.getManyByChannel(channel, {
      order: { pub_date: 'DESC' },
      take: itemsPerChannel,
    });

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const item = items[itemIndex];
      if (item === undefined) {
        continue;
      }
      const itemCounts = buildSimulatedItemAggregatedCounts({
        channelCounts,
        entityId: item.id,
        itemCount: items.length,
        itemIndex,
      });
      await itemStatsService.upsertCounts(item.id, itemCounts);
      itemRows += 1;
    }
  }

  const clips = await clipService.getManyPublic(null, null, {
    order: { id: 'ASC' },
    take: PUBLIC_LIST_TAKE,
  });
  const playlists = await playlistService.getManyPublic({
    order: { id: 'ASC' },
    take: PUBLIC_LIST_TAKE,
  });
  const accounts = await accountService.getManyPublic({
    order: { id: 'ASC' },
    take: PUBLIC_LIST_TAKE,
  });

  const clipRows = await seedRankedPublicEntities(clips, (id, counts) =>
    clipStatsService.upsertCounts(id, counts)
  );
  const playlistRows = await seedRankedPublicEntities(playlists, (id, counts) =>
    playlistStatsService.upsertCounts(id, counts)
  );
  const accountRows = await seedRankedPublicEntities(accounts, (id, counts) =>
    accountStatsService.upsertCounts(id, counts)
  );

  logger.info(
    `[devStatsSeedSimulatedAggregated] Done. Channels: ${channelRows}, items: ${itemRows}, clips: ${clipRows}, playlists: ${playlistRows}, accounts: ${accountRows}.`
  );
}

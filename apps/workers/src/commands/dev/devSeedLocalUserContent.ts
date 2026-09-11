import {
  CLIPS_PER_ACCOUNT,
  DUMMY_AV_PLAYLIST_TITLE,
  DUMMY_MUSIC_PLAYLIST_TITLE,
  dummyClipTitle,
  dummyClipWindow,
  FOLLOWS_AV_COUNT,
  FOLLOWS_MUSIC_COUNT,
  ITEMS_PER_CHANNEL,
  LOCAL_USER_CONTENT_SEED_EMAILS,
  pickRotated,
  PLAYLIST_ITEM_COUNT,
} from '@workers/commands/dev/localUserContentSeedLib.js';
import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { MediumEnum, SharableStatusEnum } from '@podverse/helpers';
import type { Channel, Item } from '@podverse/orm';
import {
  AccountFollowingChannelService,
  AccountService,
  ChannelService,
  ClipService,
  ItemService,
  PlaylistResourceService,
  PlaylistService,
} from '@podverse/orm';

function channelIdTexts(channels: Channel[]): string[] {
  const idTexts: string[] = [];
  for (const channel of channels) {
    if (channel.id_text !== null && channel.id_text !== undefined && channel.id_text !== '') {
      idTexts.push(channel.id_text);
    }
  }
  return idTexts;
}

async function collectRecentItems(
  itemService: ItemService,
  channels: Channel[],
  maxItems: number
): Promise<Item[]> {
  const collected: Item[] = [];
  const seen = new Set<number>();
  for (const channel of channels) {
    const batch = await itemService.getManyByChannel(channel, {
      order: { pub_date: 'DESC' },
      take: ITEMS_PER_CHANNEL,
    });
    for (const item of batch) {
      if (item.id_text === null || item.id_text === undefined || item.id_text === '') {
        continue;
      }
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      collected.push(item);
      if (collected.length >= maxItems) {
        return collected;
      }
    }
  }
  return collected;
}

function playlistHasItem(existingItemKeys: Set<string>, item: Item): boolean {
  if (item.id_text !== null && item.id_text !== undefined && existingItemKeys.has(item.id_text)) {
    return true;
  }
  return existingItemKeys.has(String(item.id));
}

export async function devSeedLocalUserContent(_args: CommandLineArgs) {
  const logger = getLoggerService();
  const accountService = new AccountService();
  const channelService = new ChannelService();
  const itemService = new ItemService();
  const followingService = new AccountFollowingChannelService();
  const clipService = new ClipService();
  const playlistService = new PlaylistService();
  const playlistResourceService = new PlaylistResourceService();

  const avChannels = await channelService.getMany({ order: { id: 'ASC' }, take: 5000 }, 'av', null);
  const musicChannels = await channelService.getMany(
    { order: { id: 'ASC' }, take: 5000 },
    'music',
    null
  );

  if (avChannels.length === 0 && musicChannels.length === 0) {
    logger.warn('[devSeedLocalUserContent] No public parsed channels found. Parse feeds first.');
    return;
  }

  let accountsSeeded = 0;
  let followCount = 0;
  let clipCount = 0;
  let playlistCount = 0;

  for (const email of LOCAL_USER_CONTENT_SEED_EMAILS) {
    const account = await accountService.getByEmail(email);
    if (account === null) {
      logger.warn(
        `[devSeedLocalUserContent] Account missing: ${email}. Re-run make local_db_init.`
      );
      continue;
    }

    const avFollows = pickRotated(avChannels, account.id, FOLLOWS_AV_COUNT);
    const musicFollows = pickRotated(musicChannels, account.id + 3, FOLLOWS_MUSIC_COUNT);
    const followIdTexts = [...channelIdTexts(avFollows), ...channelIdTexts(musicFollows)];
    if (followIdTexts.length > 0) {
      const followResults = await followingService.followChannelsBulk(account.id, followIdTexts);
      followCount += followResults.filter((row) => row.outcome !== 'not_found').length;
    }

    const clipItems = await collectRecentItems(itemService, avFollows, CLIPS_PER_ACCOUNT);
    const existingClips = await clipService.getManyByAccount(account.id);

    for (const item of clipItems) {
      if (item.id_text === null || item.id_text === undefined) {
        continue;
      }
      const title = dummyClipTitle(item.id_text);
      const existing = existingClips.find((clip) => clip.title === title);
      const window = dummyClipWindow(account.id, item.id);
      const clipDto = {
        description: 'Local dummy clip for profile and clip lists.',
        end_time: String(window.end),
        item_id_text: item.id_text,
        sharable_status_id: SharableStatusEnum.Public,
        start_time: String(window.start),
        title,
      };
      if (existing?.id_text !== null && existing?.id_text !== undefined) {
        await clipService.update(account.id, existing.id_text, clipDto);
      } else {
        await clipService.create(account.id, clipDto);
      }
      clipCount += 1;
    }

    const avPlaylistItems = await collectRecentItems(itemService, avFollows, PLAYLIST_ITEM_COUNT);
    playlistCount += await ensureDummyPlaylist({
      accountId: account.id,
      items: avPlaylistItems,
      mediumId: MediumEnum.AV,
      playlistResourceService,
      playlistService,
      title: DUMMY_AV_PLAYLIST_TITLE,
    });

    if (musicFollows.length > 0) {
      const musicPlaylistItems = await collectRecentItems(
        itemService,
        musicFollows,
        PLAYLIST_ITEM_COUNT
      );
      playlistCount += await ensureDummyPlaylist({
        accountId: account.id,
        items: musicPlaylistItems,
        mediumId: MediumEnum.Music,
        playlistResourceService,
        playlistService,
        title: DUMMY_MUSIC_PLAYLIST_TITLE,
      });
    }

    accountsSeeded += 1;
  }

  logger.info(
    `[devSeedLocalUserContent] Done. Accounts: ${accountsSeeded}, follows: ${followCount}, clips: ${clipCount}, playlists: ${playlistCount}.`
  );
}

async function ensureDummyPlaylist(params: {
  accountId: number;
  items: Item[];
  mediumId: MediumEnum;
  playlistResourceService: PlaylistResourceService;
  playlistService: PlaylistService;
  title: string;
}): Promise<number> {
  const { accountId, items, mediumId, playlistResourceService, playlistService, title } = params;

  const [ownedPlaylists] = await playlistService.getManyPrivate(accountId, null);
  let playlist = ownedPlaylists.find((row) => row.title === title);
  if (playlist === undefined) {
    playlist = ownedPlaylists.find(
      (row) => row.medium_id === mediumId && row.is_default_likes === false
    );
  }
  if (playlist === undefined) {
    playlist = await playlistService.create(accountId, {
      description: 'Local dummy playlist for profile and playlist lists.',
      medium_id: mediumId,
      sharable_status_id: SharableStatusEnum.Public,
      title,
    });
  }

  if (playlist.id_text === null || playlist.id_text === undefined) {
    return 0;
  }

  const existingResources = await playlistResourceService.getManyByPlaylistIdText(
    playlist.id_text,
    accountId
  );
  const existingItemKeys = new Set<string>();
  for (const resource of existingResources) {
    if (resource.item_id !== null && resource.item_id !== undefined && resource.item_id !== '') {
      existingItemKeys.add(String(resource.item_id));
    }
    if (resource.item?.id_text !== null && resource.item?.id_text !== undefined) {
      existingItemKeys.add(resource.item.id_text);
    }
  }

  for (const item of items) {
    if (item.id_text === null || item.id_text === undefined) {
      continue;
    }
    if (playlistHasItem(existingItemKeys, item)) {
      continue;
    }
    await playlistResourceService.addItemToPlaylistLast(playlist.id_text, item.id_text);
    existingItemKeys.add(item.id_text);
    existingItemKeys.add(String(item.id));
  }

  await playlistService.updateLastUpdatedAndItemCount(playlist.id_text);
  return 1;
}

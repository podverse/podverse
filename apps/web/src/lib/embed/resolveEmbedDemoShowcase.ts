import type { DTOChannel, DTOItem, QueryParamsMedium } from '@podverse/helpers';
import type {
  ApiRequestService,
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';

import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import {
  EMBED_DEMO_SHOWCASE_SPECS,
  type EmbedDemoShowcaseEntry,
  resolveEmbedDemoShowcaseFromFixtures,
  shouldUseEmbedDemoFixtures,
} from './embedDemoLinks';
import { isEmbedChannelEmbeddable, isEmbedPlaylistEmbeddable } from './embedVisibility';

type ChannelWithIdText = DTOChannel & { id_text: string };
type ItemWithIdText = DTOItem & { id_text: string };

type ChannelListStrategy = {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
};

type ItemListStrategy = {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
};

type PlaylistListStrategy = {
  type: QueryParamsPlaylistsType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
};

function isUsableChannel(channel: DTOChannel): channel is ChannelWithIdText {
  return (
    channel.id_text !== null &&
    channel.id_text !== undefined &&
    channel.id_text !== '' &&
    isEmbedChannelEmbeddable(channel)
  );
}

function isUsableEmbedListItem(item: DTOItem): item is ItemWithIdText {
  return item.id_text !== null && item.id_text !== undefined && item.id_text !== '';
}

function buildChannelListStrategies(isAuthenticated: boolean): ChannelListStrategy[] {
  const strategies: ChannelListStrategy[] = [];

  if (isAuthenticated) {
    strategies.push({ type: 'subscribed', sort: 'a_z', range: null });
    strategies.push({ type: 'subscribed', sort: 'recent', range: null });
    strategies.push({ type: 'subscribed', sort: 'top', range: 'week' });
  }

  strategies.push({ type: 'global', sort: 'recent', range: null });
  strategies.push({ type: 'global', sort: 'top', range: 'week' });

  return strategies;
}

function buildItemListStrategies(isAuthenticated: boolean): ItemListStrategy[] {
  const strategies: ItemListStrategy[] = [];

  if (isAuthenticated) {
    strategies.push({ type: 'subscribed', sort: 'recent', range: null });
    strategies.push({ type: 'subscribed', sort: 'top', range: 'week' });
  }

  strategies.push({ type: 'global', sort: 'recent', range: null });
  strategies.push({ type: 'global', sort: 'top', range: 'week' });

  return strategies;
}

function buildPlaylistListStrategies(isAuthenticated: boolean): PlaylistListStrategy[] {
  const strategies: PlaylistListStrategy[] = [];

  if (isAuthenticated) {
    strategies.push({ type: 'private', sort: 'a_z', range: null });
    strategies.push({ type: 'private', sort: 'recent', range: null });
    strategies.push({ type: 'private', sort: 'top', range: 'week' });
  }

  strategies.push({ type: 'public', sort: 'top', range: 'week' });

  return strategies;
}

async function fetchEmbeddableChannels(
  api: ApiRequestService,
  medium: QueryParamsMedium,
  isAuthenticated: boolean
): Promise<ChannelWithIdText[]> {
  for (const strategy of buildChannelListStrategies(isAuthenticated)) {
    try {
      const response = await api.reqChannelGetMany({
        page: 1,
        medium,
        type: strategy.type,
        sort: strategy.sort,
        range: strategy.range,
        category: null,
      });

      const channels = response.data.filter(isUsableChannel);
      if (channels.length > 0) {
        return channels;
      }
    } catch {
      // Try the next list strategy.
    }
  }

  return [];
}

async function fetchFirstListItem(
  api: ApiRequestService,
  medium: QueryParamsMedium,
  isAuthenticated: boolean
): Promise<ItemWithIdText | null> {
  for (const strategy of buildItemListStrategies(isAuthenticated)) {
    try {
      const response = await api.reqItemGetMany({
        page: 1,
        medium,
        type: strategy.type,
        sort: strategy.sort,
        range: strategy.range,
        category: null,
      });

      const item = response.data.find(isUsableEmbedListItem);
      if (item !== undefined) {
        return item;
      }
    } catch {
      // Try the next list strategy.
    }
  }

  return null;
}

async function findFirstChannelItem(
  api: ApiRequestService,
  channel: ChannelWithIdText,
  useMusicSeason: boolean
): Promise<ItemWithIdText | null> {
  try {
    const response = useMusicSeason
      ? await api.reqItemGetManyByChannelBySeason({
          idOrIdText: channel.id_text,
          page: 1,
          sort: 'forward',
          range: null,
        })
      : await api.reqItemGetManyByChannel({
          idOrIdText: channel.id_text,
          page: 1,
          sort: 'recent',
          range: null,
        });

    return response.data.find(isUsableEmbedListItem) ?? null;
  } catch {
    return null;
  }
}

async function findFirstItemFromChannels(
  api: ApiRequestService,
  channels: ChannelWithIdText[],
  useMusicSeason: boolean
): Promise<ItemWithIdText | null> {
  for (const channel of channels) {
    const item = await findFirstChannelItem(api, channel, useMusicSeason);
    if (item !== null) {
      return item;
    }
  }

  return null;
}

async function resolvePlaylistHref(
  api: ApiRequestService,
  isAuthenticated: boolean
): Promise<string | null> {
  for (const strategy of buildPlaylistListStrategies(isAuthenticated)) {
    try {
      const response = await api.reqPlaylistGetMany({
        page: 1,
        type: strategy.type,
        sort: strategy.sort,
        range: strategy.range,
        medium: 'all',
      });

      const playlist = response.data.find(
        (entry) =>
          entry.id_text !== null &&
          entry.id_text !== undefined &&
          entry.id_text !== '' &&
          isEmbedPlaylistEmbeddable(entry)
      );

      if (playlist !== undefined && playlist.id_text !== null && playlist.id_text !== '') {
        return `/embed/playlist/${playlist.id_text}`;
      }
    } catch {
      // Try the next list strategy.
    }
  }

  return null;
}

async function resolveEmbedDemoShowcaseFromApi(): Promise<EmbedDemoShowcaseEntry[]> {
  const { isValidAuthSession, ssrApiRequestService: api } = await getSSRAuthService();

  const legacySpecs = EMBED_DEMO_SHOWCASE_SPECS.filter((spec) =>
    ['episode', 'track', 'podcast', 'album', 'playlist'].includes(spec.showcaseId)
  );

  const [avChannels, musicChannels] = await Promise.all([
    fetchEmbeddableChannels(api, 'av', isValidAuthSession),
    fetchEmbeddableChannels(api, 'music', isValidAuthSession),
  ]);

  const [episodeFromList, trackFromList, playlistHref] = await Promise.all([
    fetchFirstListItem(api, 'av', isValidAuthSession),
    fetchFirstListItem(api, 'music', isValidAuthSession),
    resolvePlaylistHref(api, isValidAuthSession),
  ]);

  const [episodeFromChannel, trackFromChannel] = await Promise.all([
    episodeFromList === null
      ? findFirstItemFromChannels(api, avChannels, false)
      : Promise.resolve(null),
    trackFromList === null
      ? findFirstItemFromChannels(api, musicChannels, true)
      : Promise.resolve(null),
  ]);

  const episodeItem = episodeFromList ?? episodeFromChannel;
  const trackItem = trackFromList ?? trackFromChannel;
  const podcastChannel = avChannels[0] ?? null;
  const albumChannel = musicChannels[0] ?? null;

  const resolvedByShowcaseId: Record<string, { href: string | null; note: string | null }> = {
    episode: {
      href: episodeItem !== null ? `/embed/episode/${episodeItem.id_text}` : null,
      note: episodeItem?.title ?? null,
    },
    track: {
      href: trackItem !== null ? `/embed/track/${trackItem.id_text}` : null,
      note: trackItem?.title ?? null,
    },
    podcast: {
      href: podcastChannel !== null ? `/embed/podcast/${podcastChannel.id_text}` : null,
      note: podcastChannel?.title ?? null,
    },
    album: {
      href: albumChannel !== null ? `/embed/album/${albumChannel.id_text}` : null,
      note: albumChannel?.title ?? null,
    },
    playlist: {
      href: playlistHref,
      note: null,
    },
  };

  return legacySpecs.map((spec) => {
    const resolved = resolvedByShowcaseId[spec.showcaseId];
    const href = resolved?.href ?? null;

    return {
      ...spec,
      href,
      note: resolved?.note ?? null,
    };
  });
}

export async function resolveEmbedDemoShowcase(): Promise<EmbedDemoShowcaseEntry[]> {
  if (shouldUseEmbedDemoFixtures()) {
    return resolveEmbedDemoShowcaseFromFixtures();
  }

  return resolveEmbedDemoShowcaseFromApi();
}

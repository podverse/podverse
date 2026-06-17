import type { DTOChannel } from '@podverse/helpers';

import {
  getClipForSeoPage,
  getItemChapterForSeoPage,
  getItemForSeoPage,
  getItemSoundbiteForSeoPage,
} from '../seo/fetchers';
import type { EmbedListRouteKind, EmbedListRow } from './embedListTypes';
import type {
  EmbedAlbumListQueryParams,
  EmbedEpisodeChaptersListQueryParams,
  EmbedPlaylistListQueryParams,
  EmbedPodcastListQueryParams,
} from './embedTypes';
import {
  buildClipRowFromDto,
  buildItemChapterRowFromDto,
  buildItemRowFromDto,
  buildSoundbiteRowFromDto,
} from './mapEmbedListRows';
import { flattenEmbedListRows, resolveEmbedListDefaultRow } from './resolveEmbedListDefaultRow';

type FetchEmbedListPlayIdTextOverrideRowInput = {
  routeKind: EmbedListRouteKind;
  channel: DTOChannel | null;
  groups: { rows: EmbedListRow[] }[];
  listQuery:
    | EmbedPodcastListQueryParams
    | EmbedAlbumListQueryParams
    | EmbedEpisodeChaptersListQueryParams
    | EmbedPlaylistListQueryParams;
};

export async function fetchEmbedListPlayIdTextOverrideRow(
  input: FetchEmbedListPlayIdTextOverrideRowInput
): Promise<EmbedListRow | null> {
  const playIdText = input.listQuery.playIdText;

  if (playIdText === null) {
    return null;
  }

  const rows = flattenEmbedListRows(input.groups);
  const matchedRow = resolveEmbedListDefaultRow(rows, playIdText);

  if (matchedRow !== null && matchedRow.playIdText === playIdText) {
    return null;
  }

  if (input.routeKind === 'playlist') {
    const item = await getItemForSeoPage(playIdText);

    if (item?.channel) {
      return buildItemRowFromDto(item.channel, item);
    }

    const clip = await getClipForSeoPage(playIdText);
    const clipItem = clip?.item ?? null;
    const clipChannel = clipItem?.channel ?? null;

    if (clip !== null && clipItem !== null && clipChannel !== null) {
      return buildClipRowFromDto(clipChannel, clip, clipItem);
    }

    const itemSoundbite = await getItemSoundbiteForSeoPage(playIdText);
    const soundbiteItem = itemSoundbite?.item ?? null;
    const soundbiteChannel = soundbiteItem?.channel ?? null;

    if (itemSoundbite !== null && soundbiteItem !== null && soundbiteChannel !== null) {
      return buildSoundbiteRowFromDto(soundbiteChannel, itemSoundbite, soundbiteItem);
    }

    return null;
  }

  if (input.channel === null) {
    return null;
  }

  const channel = input.channel;

  if (input.routeKind === 'episode-chapters') {
    const itemChapter = await getItemChapterForSeoPage(playIdText);
    const chapterItemRef = itemChapter?.item_chapters_feed?.item ?? null;

    if (itemChapter === null || chapterItemRef === null) {
      return null;
    }

    const item = await getItemForSeoPage(chapterItemRef.id_text);

    if (item === null || item.channel_id !== channel.id) {
      return null;
    }

    return buildItemChapterRowFromDto(channel, item, itemChapter);
  }

  if (input.routeKind === 'album') {
    const albumQuery = input.listQuery as EmbedAlbumListQueryParams;

    if (albumQuery.type !== 'tracks') {
      return null;
    }

    const item = await getItemForSeoPage(playIdText);

    if (item === null || item.channel_id !== channel.id) {
      return null;
    }

    return buildItemRowFromDto(channel, item);
  }

  const podcastQuery = input.listQuery as EmbedPodcastListQueryParams;

  if (podcastQuery.type === 'clips') {
    const clip = await getClipForSeoPage(playIdText);
    const item = clip?.item ?? null;
    const rowChannel = item?.channel ?? null;

    if (clip === null || item === null || rowChannel === null) {
      return null;
    }

    if (rowChannel.id !== channel.id) {
      return null;
    }

    return buildClipRowFromDto(rowChannel, clip, item);
  }

  if (podcastQuery.type === 'soundbites') {
    const itemSoundbite = await getItemSoundbiteForSeoPage(playIdText);
    const item = itemSoundbite?.item ?? null;
    const rowChannel = item?.channel ?? null;

    if (itemSoundbite === null || item === null || rowChannel === null) {
      return null;
    }

    if (rowChannel.id !== channel.id) {
      return null;
    }

    return buildSoundbiteRowFromDto(rowChannel, itemSoundbite, item);
  }

  if (podcastQuery.type === 'boosts') {
    return null;
  }

  const item = await getItemForSeoPage(playIdText);

  if (item === null || item.channel_id !== channel.id) {
    return null;
  }

  return buildItemRowFromDto(channel, item);
}

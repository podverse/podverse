import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaylistResource,
} from '@podverse/helpers';

import type { EmbedEpisodeChaptersSort } from './embedTypes';
import type { EmbedListGroup, EmbedListRow } from './embedListTypes';
import { formatEmbedDisplayTitle } from './formatEmbedDisplayTitle';
import { resolveEmbedMediaType } from './resolveEmbedMediaType';

function buildItemRow(channel: DTOChannel, item: DTOItem, rowKey: string): EmbedListRow {
  const resource = {
    channel,
    item,
    clip: null,
    itemChapter: null,
    itemSoundbite: null,
  };

  return {
    ...resource,
    rowKey,
    playIdText: item.id_text,
    listLabel: item.title ?? '',
    mediaType: resolveEmbedMediaType(channel),
  };
}

function buildClipRow(
  channel: DTOChannel,
  clip: DTOClip,
  item: DTOItem,
  rowKey: string
): EmbedListRow {
  const resource = {
    channel,
    item,
    clip,
    itemChapter: null,
    itemSoundbite: null,
  };

  return {
    ...resource,
    rowKey,
    playIdText: clip.id_text,
    listLabel: formatEmbedDisplayTitle(resource),
    mediaType: resolveEmbedMediaType(channel),
  };
}

function buildSoundbiteRow(
  channel: DTOChannel,
  itemSoundbite: DTOItemSoundbite,
  item: DTOItem,
  rowKey: string
): EmbedListRow {
  const resource = {
    channel,
    item,
    clip: null,
    itemChapter: null,
    itemSoundbite,
  };

  return {
    ...resource,
    rowKey,
    playIdText: itemSoundbite.id_text,
    listLabel: formatEmbedDisplayTitle(resource),
    mediaType: resolveEmbedMediaType(channel),
  };
}

function buildItemChapterRow(
  channel: DTOChannel,
  item: DTOItem,
  itemChapter: DTOItemChapter,
  rowKey: string
): EmbedListRow {
  const resource = {
    channel,
    item,
    clip: null,
    itemChapter,
    itemSoundbite: null,
  };

  const chapterTitle = itemChapter.title?.trim() ?? '';

  return {
    ...resource,
    rowKey,
    playIdText: itemChapter.id_text,
    listLabel: chapterTitle !== '' ? chapterTitle : formatEmbedDisplayTitle(resource),
    mediaType: resolveEmbedMediaType(channel),
  };
}

/**
 * The chapters endpoint returns rows ordered by `start_time ASC`; honor the
 * client-side `sort` param by reversing for descending. Sort explicitly so the
 * ordering is deterministic regardless of upstream ordering.
 */
export function sortEmbedItemChapters(
  chapters: DTOItemChapter[],
  sort: EmbedEpisodeChaptersSort
): DTOItemChapter[] {
  const ordered = [...chapters].sort((a, b) => Number(a.start_time) - Number(b.start_time));
  return sort === 'desc' ? ordered.reverse() : ordered;
}

/**
 * Unlike podcast/album/playlist list rows (each a distinct enclosure), every
 * chapter row shares the parent episode enclosure and plays by seeking to the
 * chapter `start_time` (handled by the shared single-resource playback path via
 * `itemChapter`).
 */
export function mapItemChaptersToEmbedListRows(
  channel: DTOChannel,
  item: DTOItem,
  itemChapters: DTOItemChapter[]
): EmbedListGroup[] {
  const rows = itemChapters.map((itemChapter) =>
    buildItemChapterRow(channel, item, itemChapter, `chapter:${itemChapter.id_text}`)
  );

  return [
    {
      groupKey: 'chapters',
      title: null,
      rows,
    },
  ];
}

export function mapChannelItemsToEmbedListRows(
  channel: DTOChannel,
  items: DTOItem[]
): EmbedListGroup[] {
  const rows = items.map((item) => buildItemRow(channel, item, `item:${item.id_text}`));

  return [
    {
      groupKey: 'items',
      title: null,
      rows,
    },
  ];
}

export function mapChannelClipsToEmbedListRows(
  channel: DTOChannel,
  clips: DTOClip[]
): EmbedListGroup[] {
  const rows: EmbedListRow[] = [];

  for (const clip of clips) {
    const item = clip.item;

    if (!item) {
      continue;
    }

    rows.push(buildClipRow(item.channel ?? channel, clip, item, `clip:${clip.id_text}`));
  }

  return [
    {
      groupKey: 'clips',
      title: null,
      rows,
    },
  ];
}

export function mapChannelSoundbitesToEmbedListRows(
  channel: DTOChannel,
  soundbites: DTOItemSoundbite[]
): EmbedListGroup[] {
  const rows: EmbedListRow[] = [];

  for (const itemSoundbite of soundbites) {
    const item = itemSoundbite.item;

    if (!item) {
      continue;
    }

    rows.push(
      buildSoundbiteRow(
        item.channel ?? channel,
        itemSoundbite,
        item,
        `soundbite:${itemSoundbite.id_text}`
      )
    );
  }

  return [
    {
      groupKey: 'soundbites',
      title: null,
      rows,
    },
  ];
}

export function mapAlbumItemsToEmbedListGroups(
  channel: DTOChannel,
  items: DTOItem[]
): EmbedListGroup[] {
  const groups = new Map<string, EmbedListRow[]>();

  for (const item of items) {
    const seasonTitle = item.item_season?.title?.trim() ?? '';
    const groupKey = seasonTitle !== '' ? `season:${seasonTitle}` : 'tracks';
    const existingRows = groups.get(groupKey) ?? [];
    existingRows.push(buildItemRow(channel, item, `item:${item.id_text}`));
    groups.set(groupKey, existingRows);
  }

  return Array.from(groups.entries()).map(([groupKey, rows]) => ({
    groupKey,
    title: groupKey.startsWith('season:') ? groupKey.replace(/^season:/, '') : null,
    rows,
  }));
}

export function mapPlaylistResourcesToEmbedListRows(
  resources: DTOPlaylistResource[]
): EmbedListGroup[] {
  const rows: EmbedListRow[] = [];

  for (const resource of resources) {
    if (resource.add_by_rss_hash_id) {
      continue;
    }

    if (resource.clip?.item) {
      const item = resource.clip.item;
      const rowChannel = item.channel;

      if (!rowChannel) {
        continue;
      }

      rows.push(
        buildClipRow(rowChannel, resource.clip, item, `playlist-clip:${resource.clip.id_text}`)
      );
      continue;
    }

    if (resource.item_soundbite?.item) {
      const item = resource.item_soundbite.item;
      const rowChannel = item.channel;

      if (!rowChannel) {
        continue;
      }

      rows.push(
        buildSoundbiteRow(
          rowChannel,
          resource.item_soundbite,
          item,
          `playlist-soundbite:${resource.item_soundbite.id_text}`
        )
      );
      continue;
    }

    if (resource.item) {
      const rowChannel = resource.item.channel;

      if (!rowChannel) {
        continue;
      }

      rows.push(buildItemRow(rowChannel, resource.item, `playlist-item:${resource.item.id_text}`));
    }
  }

  return [
    {
      groupKey: 'playlist-resources',
      title: null,
      rows,
    },
  ];
}

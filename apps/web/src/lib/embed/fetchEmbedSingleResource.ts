import type { DTOChannel, DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import {
  getChannelForSeoPage,
  getClipForSeoPage,
  getItemChapterForSeoPage,
  getItemForSeoPage,
  getItemSoundbiteForSeoPage,
} from '../seo/fetchers';
import type { EmbedRouteKind } from './embedTypes';

export type EmbedSingleResourcePayload = {
  channel: DTOChannel;
  item: DTOItem;
  clip: DTOClip | null;
  itemChapter: DTOItemChapter | null;
  itemSoundbite: DTOItemSoundbite | null;
};

export async function fetchEmbedSingleResource(
  routeKind: EmbedRouteKind,
  resourceId: string
): Promise<EmbedSingleResourcePayload | null> {
  try {
    if (routeKind === 'episode' || routeKind === 'track') {
      const item = await getItemForSeoPage(resourceId);

      if (!item) {
        return null;
      }

      const channel = await getChannelForSeoPage(item.channel_id);

      if (!channel) {
        return null;
      }

      return {
        channel,
        item,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
      };
    }

    if (routeKind === 'clip') {
      const clip = await getClipForSeoPage(resourceId);

      if (!clip?.item) {
        return null;
      }

      const item = await getItemForSeoPage(clip.item.id_text);

      if (!item) {
        return null;
      }

      const channel = await getChannelForSeoPage(item.channel_id);

      if (!channel) {
        return null;
      }

      return {
        channel,
        item,
        clip,
        itemChapter: null,
        itemSoundbite: null,
      };
    }

    if (routeKind === 'chapter') {
      const itemChapter = await getItemChapterForSeoPage(resourceId);

      if (!itemChapter.item_chapters_feed?.item) {
        return null;
      }

      const item = await getItemForSeoPage(itemChapter.item_chapters_feed.item.id_text);

      if (!item) {
        return null;
      }

      const channel = await getChannelForSeoPage(item.channel_id);

      if (!channel) {
        return null;
      }

      return {
        channel,
        item,
        clip: null,
        itemChapter,
        itemSoundbite: null,
      };
    }

    if (routeKind === 'official-clip') {
      const itemSoundbite = await getItemSoundbiteForSeoPage(resourceId);

      if (!itemSoundbite.item) {
        return null;
      }

      const item = await getItemForSeoPage(itemSoundbite.item.id_text);

      if (!item) {
        return null;
      }

      const channel = await getChannelForSeoPage(item.channel_id);

      if (!channel) {
        return null;
      }

      return {
        channel,
        item,
        clip: null,
        itemChapter: null,
        itemSoundbite,
      };
    }

    return null;
  } catch {
    return null;
  }
}

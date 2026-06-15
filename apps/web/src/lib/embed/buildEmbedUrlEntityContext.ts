import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaylist,
} from '@podverse/helpers';

import type { EmbedUrlEntityContext } from './buildEmbedUrl';
import type { EmbedUrlLayoutPreference } from './buildEmbedUrl';
import type { EmbedBuilderQueryParams } from './embedBuilderTypes';

export function buildEmbedUrlEntityContextFromBuilderParams(
  params: EmbedBuilderQueryParams,
  layout: EmbedUrlLayoutPreference
): EmbedUrlEntityContext {
  const useListLayout = layout === 'list';
  // A chapters list is item-based (rendered via the episode-chapters route), so keep the item even
  // in list layout. All other list content types are channel-based and drop the item.
  const keepItemForChaptersList = useListLayout && params.listContentType === 'chapters';

  const channel =
    params.channel !== null
      ? ({
          id_text: params.channel,
          ...(params.mediumId !== null ? { medium_id: params.mediumId } : {}),
        } as DTOChannel)
      : null;

  return {
    channel,
    item:
      (!useListLayout || keepItemForChaptersList) && params.item
        ? ({ id_text: params.item } as DTOItem)
        : null,
    clip: params.clip ? ({ id_text: params.clip } as DTOClip) : null,
    item_chapter: params.itemChapter ? ({ id_text: params.itemChapter } as DTOItemChapter) : null,
    item_soundbite: params.itemSoundbite
      ? ({ id_text: params.itemSoundbite } as DTOItemSoundbite)
      : null,
    playlist: params.playlist ? ({ id_text: params.playlist } as DTOPlaylist) : null,
  };
}

export function buildEmbedUrlEntityContextFromShareState(input: {
  channel: DTOChannel | null;
  item: DTOItem | null;
  clip: DTOClip | null;
  item_chapter: DTOItemChapter | null;
  item_soundbite: DTOItemSoundbite | null;
  playlist: DTOPlaylist | null;
  useListLayout?: boolean;
}): EmbedUrlEntityContext {
  const useListLayout = input.useListLayout === true;

  return {
    channel: input.channel,
    item: useListLayout ? null : input.item,
    clip: input.clip,
    item_chapter: input.item_chapter,
    item_soundbite: input.item_soundbite,
    playlist: input.playlist,
  };
}

export function resolveEmbedPlayIdTextFromBuilderParams(
  params: EmbedBuilderQueryParams
): string | null {
  if (params.playlistItem) {
    return params.playlistItem;
  }

  return params.playIdText;
}

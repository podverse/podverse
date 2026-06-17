import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaylist,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { EmbedBuilderUrlInput } from './buildEmbedBuilderUrl';
import { buildEmbedBuilderUrlPath } from './buildEmbedBuilderUrl';

export type EmbedShareAction = {
  testId: 'share-embed-builder';
  href: string;
};

type EmbedShareContext = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  clip: DTOClip | null;
  item_chapter: DTOItemChapter | null;
  item_soundbite: DTOItemSoundbite | null;
  playlist: DTOPlaylist | null;
  playlist_item: string | null;
};

const SHARE_EMBED_BUILDER_TEST_ID = 'share-embed-builder' as const;

function buildAction(input: EmbedBuilderUrlInput): EmbedShareAction {
  return {
    testId: SHARE_EMBED_BUILDER_TEST_ID,
    href: buildEmbedBuilderUrlPath(input),
  };
}

function channelBuilderFields(
  channel: DTOChannel | null
): Pick<EmbedBuilderUrlInput, 'channel' | 'medium_id'> {
  if (channel === null || channel.id_text === null || channel.id_text === undefined) {
    return { channel: null, medium_id: null };
  }

  return {
    channel: channel.id_text,
    medium_id: channel.medium_id,
  };
}

export function getEmbedShareAction(context: EmbedShareContext): EmbedShareAction | null {
  const channelFields = channelBuilderFields(context.channel);
  const channelId = channelFields.channel;
  const itemId = context.item?.id_text ?? null;
  const playlistId = context.playlist?.id_text ?? null;
  const playlistItem = context.playlist_item;
  const mediumId = context.channel?.medium_id;

  if (context.item_soundbite?.id_text) {
    return buildAction({
      playerSize: 'compact',
      listEnabled: false,
      ...channelFields,
      item: itemId,
      official_clip: context.item_soundbite.id_text,
    });
  }

  if (context.item_chapter?.id_text) {
    return buildAction({
      playerSize: 'compact',
      listEnabled: false,
      ...channelFields,
      item: itemId,
      chapter: context.item_chapter.id_text,
    });
  }

  const clipIdText = context.clip?.id_text ?? null;
  if (clipIdText !== null) {
    return buildAction({
      playerSize: 'compact',
      listEnabled: false,
      ...channelFields,
      item: itemId,
      clip: clipIdText,
    });
  }

  if (playlistId && playlistItem) {
    return buildAction({
      playerSize: 'compact',
      listEnabled: true,
      playlist: playlistId,
      playlistItem,
    });
  }

  if (channelId !== null && itemId !== null) {
    if (mediumId === MediumEnum.Music) {
      return buildAction({
        playerSize: 'compact',
        listEnabled: false,
        ...channelFields,
        item: itemId,
      });
    }

    return buildAction({
      playerSize: 'compact',
      listEnabled: false,
      ...channelFields,
      item: itemId,
    });
  }

  if (playlistId) {
    return buildAction({
      playerSize: 'compact',
      listEnabled: true,
      playlist: playlistId,
    });
  }

  if (channelId !== null) {
    if (mediumId === MediumEnum.Podcast || mediumId === MediumEnum.Video) {
      return buildAction({
        playerSize: 'compact',
        listEnabled: true,
        ...channelFields,
      });
    }

    if (mediumId === MediumEnum.Music) {
      return buildAction({
        playerSize: 'compact',
        listEnabled: true,
        ...channelFields,
      });
    }
  }

  return null;
}

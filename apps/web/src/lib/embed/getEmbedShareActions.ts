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
import type { EmbedBuilderType } from './embedBuilderTypes';

export type EmbedShareAction = {
  labelKey:
    | 'embed_podcast'
    | 'embed_album'
    | 'embed_playlist'
    | 'embed_episode'
    | 'embed_track'
    | 'embed_clip'
    | 'embed_chapter'
    | 'embed_official_clip';
  testId: string;
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

function buildAction(
  labelKey: EmbedShareAction['labelKey'],
  testId: string,
  input: EmbedBuilderUrlInput
): EmbedShareAction {
  return {
    labelKey,
    testId,
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

export function getEmbedShareActions(context: EmbedShareContext): EmbedShareAction[] {
  const actions: EmbedShareAction[] = [];
  const channelFields = channelBuilderFields(context.channel);
  const channelId = channelFields.channel;
  const itemId = context.item?.id_text ?? null;
  const playlistId = context.playlist?.id_text ?? null;
  const playlistItem = context.playlist_item;
  const mediumId = context.channel?.medium_id;

  if (playlistId) {
    actions.push(
      buildAction('embed_playlist', 'share-embed-playlist', {
        type: 'audio-list',
        playlist: playlistId,
        playlistItem,
        autoplay: true,
      })
    );
  }

  if (channelId !== null) {
    if (mediumId === MediumEnum.Podcast || mediumId === MediumEnum.Video) {
      actions.push(
        buildAction('embed_podcast', 'share-embed-podcast', {
          type: 'audio-list',
          ...channelFields,
          playlist: playlistId,
          playlistItem,
          autoplay: true,
        })
      );
    } else if (mediumId === MediumEnum.Music) {
      actions.push(
        buildAction('embed_album', 'share-embed-album', {
          type: 'audio-list',
          ...channelFields,
          autoplay: true,
        })
      );
    }
  }

  const hasSingleItemContext =
    channelId !== null &&
    itemId !== null &&
    context.clip === null &&
    context.item_chapter === null &&
    context.item_soundbite === null;

  if (hasSingleItemContext) {
    const defaultType: EmbedBuilderType = 'audio';

    if (mediumId === MediumEnum.Music) {
      actions.push(
        buildAction('embed_track', 'share-embed-track', {
          type: defaultType,
          ...channelFields,
          item: itemId,
        })
      );
    } else {
      actions.push(
        buildAction('embed_episode', 'share-embed-episode', {
          type: defaultType,
          ...channelFields,
          item: itemId,
        })
      );
    }
  }

  const clipIdText = context.clip?.id_text ?? null;

  if (clipIdText !== null) {
    actions.push(
      buildAction('embed_clip', 'share-embed-clip', {
        type: 'audio',
        ...channelFields,
        item: itemId,
        clip: clipIdText,
      })
    );
  }

  if (context.item_chapter?.id_text) {
    actions.push(
      buildAction('embed_chapter', 'share-embed-chapter', {
        type: 'audio',
        ...channelFields,
        item: itemId,
        chapter: context.item_chapter.id_text,
      })
    );
  }

  if (context.item_soundbite?.id_text) {
    actions.push(
      buildAction('embed_official_clip', 'share-embed-official-clip', {
        type: 'audio',
        ...channelFields,
        item: itemId,
        official_clip: context.item_soundbite.id_text,
      })
    );
  }

  const deduped = new Map<string, EmbedShareAction>();
  for (const action of actions) {
    deduped.set(action.testId, action);
  }

  return [...deduped.values()];
}

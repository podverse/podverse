import { MediumEnum } from '@podverse/helpers';

export const EMBED_BUILDER_SOURCE_KINDS = [
  'official_clip',
  'chapter',
  'clip',
  'playlist',
  'track',
  'episode',
  'album',
  'podcast',
  'default',
] as const;

export type EmbedBuilderSourceKind = (typeof EMBED_BUILDER_SOURCE_KINDS)[number];

export type EmbedBuilderSourceKindParams = {
  channel: string | null;
  mediumId: number | null;
  item: string | null;
  clip: string | null;
  itemChapter: string | null;
  itemSoundbite: string | null;
  playlist: string | null;
};

/**
 * Derives the share-source entity kind for embed builder orientation copy.
 * Priority matches {@link getEmbedShareAction} handoff from Share.
 */
export function resolveEmbedBuilderSourceKind(
  params: EmbedBuilderSourceKindParams
): EmbedBuilderSourceKind {
  if (params.itemSoundbite !== null) {
    return 'official_clip';
  }

  if (params.itemChapter !== null) {
    return 'chapter';
  }

  if (params.clip !== null) {
    return 'clip';
  }

  if (params.playlist !== null) {
    return 'playlist';
  }

  if (params.channel !== null && params.item !== null) {
    if (params.mediumId === MediumEnum.Music) {
      return 'track';
    }

    return 'episode';
  }

  if (params.channel !== null) {
    if (params.mediumId === MediumEnum.Music) {
      return 'album';
    }

    return 'podcast';
  }

  return 'default';
}

export function embedBuilderOrientTranslationKeys(kind: EmbedBuilderSourceKind): {
  helpKey: `embed_builder_orient_${EmbedBuilderSourceKind}_help`;
} {
  return {
    helpKey: `embed_builder_orient_${kind}_help`,
  };
}

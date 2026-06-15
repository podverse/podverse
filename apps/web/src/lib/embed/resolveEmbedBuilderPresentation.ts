import type { EmbedBuilderPresentation, EmbedBuilderType } from './embedBuilderTypes';
import type { EmbedPlayerSizeQuery, EmbedPresentationQuery } from './embedTypes';

export function resolveDefaultMediaPreferenceForPlayerSize(
  playerSize: EmbedPlayerSizeQuery
): EmbedPresentationQuery {
  return playerSize === 'tall' ? 'video' : 'audio';
}

export function resolveEmbedBuilderPresentation(type: EmbedBuilderType): EmbedBuilderPresentation {
  switch (type) {
    case 'short':
      return { layout: 'single', playerSize: 'short', mediaPreference: 'audio' };
    case 'tall':
      return { layout: 'single', playerSize: 'tall', mediaPreference: 'video' };
    case 'short-list':
      return { layout: 'list', playerSize: 'short', mediaPreference: 'audio' };
    case 'tall-list':
      return { layout: 'list', playerSize: 'tall', mediaPreference: 'video' };
  }
}

export function isEmbedBuilderListType(type: EmbedBuilderType): boolean {
  return type === 'short-list' || type === 'tall-list';
}

export function isEmbedBuilderTallType(type: EmbedBuilderType): boolean {
  return type === 'tall' || type === 'tall-list';
}

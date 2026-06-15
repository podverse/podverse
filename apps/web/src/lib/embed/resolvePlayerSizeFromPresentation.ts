import type { EmbedPlayerSizeQuery, EmbedPresentationQuery } from './embedTypes';

export function resolvePlayerSizeFromPresentation(
  presentation: EmbedPresentationQuery
): EmbedPlayerSizeQuery {
  return presentation === 'video' ? 'tall' : 'short';
}

export function resolveEffectiveEmbedListPlayerSize(input: {
  playerSize: EmbedPlayerSizeQuery;
  playerSizeLocked: boolean;
  mediaPreference: EmbedPresentationQuery;
}): EmbedPlayerSizeQuery {
  if (input.playerSizeLocked && input.playerSize === 'short') {
    return 'short';
  }

  if (input.playerSizeLocked && input.playerSize === 'tall') {
    return 'tall';
  }

  return input.mediaPreference === 'video' ? 'tall' : 'short';
}

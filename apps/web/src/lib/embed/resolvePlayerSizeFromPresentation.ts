import type { EmbedPlayerSizeQuery, EmbedPresentationQuery } from './embedTypes';

export function resolvePlayerSizeFromPresentation(
  presentation: EmbedPresentationQuery
): EmbedPlayerSizeQuery {
  return presentation === 'video' ? 'responsive' : 'compact';
}

export function resolveEffectiveEmbedListPlayerSize(input: {
  playerSize: EmbedPlayerSizeQuery;
  playerSizeLocked: boolean;
  mediaPreference: EmbedPresentationQuery;
}): EmbedPlayerSizeQuery {
  if (input.playerSizeLocked && input.playerSize === 'compact') {
    return 'compact';
  }

  if (input.playerSizeLocked && input.playerSize === 'responsive') {
    return 'responsive';
  }

  return input.mediaPreference === 'video' ? 'responsive' : 'compact';
}

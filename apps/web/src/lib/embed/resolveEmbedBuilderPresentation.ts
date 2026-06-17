import type { EmbedBuilderPresentation, EmbedBuilderQueryParams } from './embedBuilderTypes';
import type { EmbedPlayerSizeQuery, EmbedPresentationQuery } from './embedTypes';

export function resolveDefaultMediaPreferenceForPlayerSize(
  playerSize: EmbedPlayerSizeQuery
): EmbedPresentationQuery {
  return playerSize === 'responsive' ? 'video' : 'audio';
}

export function resolveEmbedBuilderPresentation(
  params: Pick<EmbedBuilderQueryParams, 'playerSize' | 'listEnabled'>
): EmbedBuilderPresentation {
  return {
    layout: params.listEnabled ? 'list' : 'single',
    playerSize: params.playerSize,
    mediaPreference: resolveDefaultMediaPreferenceForPlayerSize(params.playerSize),
  };
}

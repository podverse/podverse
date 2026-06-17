import type { DTOChannel } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { EmbedMediaType, EmbedPlayerSizeQuery, EmbedPresentationQuery } from './embedTypes';

export function toEmbedPresentationQuery(mediaType: EmbedMediaType): EmbedPresentationQuery {
  return mediaType === 'video' ? 'video' : 'audio';
}

export function resolveEmbedMediaType(channel: DTOChannel): EmbedMediaType {
  if (channel.medium_id === MediumEnum.Video) {
    return 'video';
  }

  return 'audio';
}

export function resolveEmbedPlayerSizeFromChannel(channel: DTOChannel): EmbedPlayerSizeQuery {
  return resolveEmbedMediaType(channel) === 'video' ? 'responsive' : 'compact';
}

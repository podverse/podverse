import type { DTOChannel } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { EmbedMediaType, EmbedPlayerSizeQuery } from './embedTypes';

export function resolveEmbedMediaType(channel: DTOChannel): EmbedMediaType {
  if (channel.medium_id === MediumEnum.Video) {
    return 'video';
  }

  return 'audio';
}

export function resolveEmbedPlayerSizeFromChannel(channel: DTOChannel): EmbedPlayerSizeQuery {
  return resolveEmbedMediaType(channel) === 'video' ? 'tall' : 'short';
}

import type { DTOChannel } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { EmbedMediaType } from './embedTypes';

export function resolveEmbedMediaType(channel: DTOChannel): EmbedMediaType {
  if (channel.medium_id === MediumEnum.Video) {
    return 'video';
  }

  return 'audio';
}

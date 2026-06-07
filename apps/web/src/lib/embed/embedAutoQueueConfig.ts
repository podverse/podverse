import { getShuffleHash } from '@podverse/helpers-requests';

import type { AutoQueueConfig } from '../../contexts/AutoQueue';

export const EMBED_DISABLED_AUTO_QUEUE_CONFIG: AutoQueueConfig = {
  playlist_id_text: null,
  disabled: true,
  random: false,
  repeat: false,
  nextPage: 1,
  shuffleHash: getShuffleHash(),
};

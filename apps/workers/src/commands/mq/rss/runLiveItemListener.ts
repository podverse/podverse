import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

import { sleep } from '@podverse/helpers';
import { mqRSSRunLiveItemListener as mqRSSRunLiveItemListenerFunction } from '@podverse/mq';

export const mqRSSRunLiveItemListener = async () => {
  await mqRSSRunLiveItemListenerFunction(getActiveMQArtemisService());

  while (true) {
    await sleep(1000);
  }
};

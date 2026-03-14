import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

import { mqRSSRunLiveItemListener as mqRSSRunLiveItemListenerFunction } from '@podverse/mq';

export const mqRSSRunLiveItemListener = async () => {
  await mqRSSRunLiveItemListenerFunction(getActiveMQArtemisService());

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

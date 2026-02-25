import { mqRSSRunLiveItemListener as mqRSSRunLiveItemListenerFunction } from '@podverse/mq';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

export const mqRSSRunLiveItemListener = async () => {
  await mqRSSRunLiveItemListenerFunction(getActiveMQArtemisService());

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

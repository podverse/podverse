import { mqRSSRunLiveItemListener as mqRSSRunLiveItemListenerFunction } from '@podverse/mq';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';

export const mqRSSRunLiveItemListener = async () => {
  await mqRSSRunLiveItemListenerFunction(
    activeMQArtemisService,
  );

  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

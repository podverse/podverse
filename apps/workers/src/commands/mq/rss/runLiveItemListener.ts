import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

import { sleep } from '@podverse/helpers';
import { createActiveMQShutdown, mqRSSRunLiveItemListener as startLiveItemListener } from '@podverse/mq';

export const mqRSSRunLiveItemListener = async () => {
  const activeMQArtemisService = getActiveMQArtemisService();
  const liveItemListener = startLiveItemListener(activeMQArtemisService);

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(activeMQArtemisService, console, () => {
    keepRunning = false;
    liveItemListener.stop();
  });

  while (keepRunning) {
    await sleep(1000);
  }

  unregister();
};

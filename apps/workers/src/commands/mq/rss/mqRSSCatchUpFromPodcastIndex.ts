import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSCatchUpFromPodcastIndex as mqRSSCatchUpFromPodcastIndexFunction } from '@podverse/mq';

function firstArg(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isQueueNameParamKey(value: string): value is MQQueueNameParamKey {
  return validMQQueueNamesParamKeys.some((key) => key === value);
}

/**
 * `mqRSSCatchUpFromPodcastIndex -q <queue> -since <epoch seconds>`: checks every feed against
 * Podcast Index for a gap that started at `-since` and queues the feeds that changed.
 */
export const mqRSSCatchUpFromPodcastIndex = async (args: CommandLineArgs) => {
  const queueArg = firstArg(args.q);
  if (queueArg === undefined || queueArg === '') {
    throw new Error('queueName (-q) parameter is required');
  }
  if (!isQueueNameParamKey(queueArg)) {
    throw new Error(
      `Invalid queueName. Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`
    );
  }

  const sinceSeconds = Number(firstArg(args.since) ?? '');
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(sinceSeconds) || sinceSeconds <= 0 || sinceSeconds > nowSeconds) {
    throw new Error('since (-since) is required: a past Unix time in seconds');
  }

  const loggerService = getLoggerService();
  const result = await mqRSSCatchUpFromPodcastIndexFunction(
    getActiveMQArtemisService(),
    getPodcastIndexService(),
    {
      ...MQ_QUEUES[queueArg],
      sinceSeconds,
      closeAfterSend: true,
      loggerService,
    },
    {
      forceParse: false,
      onDemandParserEvent: {
        accountId: null,
        type: null,
        remoteParentPodcastIndexId: null,
      },
    }
  );

  if (result.outcome === 'lock_held') {
    throw new Error(
      'mqRSSCatchUpFromPodcastIndex: another run holds the recent_data stream; try again after it ends'
    );
  }
  if (result.outcome === 'send_failed') {
    throw new Error(
      `mqRSSCatchUpFromPodcastIndex: ${result.failed} feed message(s) were not sent; ` +
        `rerun with the same -since to continue after feed.id=${result.lastFeedId ?? 'none'}`
    );
  }
  if (result.outcome === 'time_cap') {
    loggerService.info(
      '[mqRSSCatchUpFromPodcastIndex] The sweep stopped at its time cap. The recent-feeds poller ' +
        'continues it on its next run, or rerun this command with the same -since.'
    );
  }
};

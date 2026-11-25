import type { CommandLineArgs } from '@workers/commands/index.js';
import { getCatalogConfig } from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getIndexProvider } from '@workers/factories/indexProvider.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import { collectCatalogAllowlistAddTargets } from '@workers/lib/catalog/collectCatalogAllowlistAddTargets.js';
import { sleepRateLimit } from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';

import { extractDeadFeedCsvRow } from '@podverse/external-services-podcast-index';
import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';
import { FeedService } from '@podverse/orm';

const LOG_PREFIX = '[mqRSSAddCatalogAllowlist]';

function formatIdList(ids: readonly number[]): string {
  return ids.length === 0 ? 'none' : ids.join(', ');
}

export const mqRSSAddCatalogAllowlist = async (args: CommandLineArgs) => {
  const logger = getLoggerService();

  const qRaw = 'q' in args ? (Array.isArray(args.q) ? args.q[0] : args.q) : undefined;
  const mqQueueNameParamKey = String(qRaw !== undefined && qRaw !== '' ? qRaw : 'rss-normal') as
    MQQueueNameParamKey | string;

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey as MQQueueNameParamKey)) {
    throw new Error(
      `Invalid queueName (-q). Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`
    );
  }

  const key = mqQueueNameParamKey as MQQueueNameParamKey;
  const { podcastIndexIdAllowlist } = getCatalogConfig();
  if (podcastIndexIdAllowlist === null || podcastIndexIdAllowlist.length === 0) {
    logger.info(`${LOG_PREFIX} CATALOG_PODCAST_INDEX_ID_ALLOWLIST is blank; nothing to add.`);
    return;
  }

  const storedPodcastIndexIds = new Set(await new FeedService().listPodcastIndexIds());
  const listedCount = podcastIndexIdAllowlist.length;
  const alreadyStored = podcastIndexIdAllowlist.filter((id) =>
    storedPodcastIndexIds.has(id)
  ).length;

  const plan = await collectCatalogAllowlistAddTargets({
    allowlist: podcastIndexIdAllowlist,
    storedPodcastIndexIds,
    indexProvider: getIndexProvider(),
    sleepBetweenLookups: sleepRateLimit,
    loadDeadFeedTargets: async () => {
      const map = new Map<number, number | null>();
      await getPodcastIndexService().deadFeedsDownloadAndExtractCSV((row) => {
        const parsed = extractDeadFeedCsvRow(row);
        if (parsed !== null) {
          map.set(parsed.id_to_archive, parsed.duplicate_id_to_keep);
        }
      });
      return map;
    },
  });

  const mqConstantMessageOptions = MQ_QUEUES[key];
  let enqueued = 0;
  let failed = 0;

  if (plan.targets.length > 0) {
    const artemis = getActiveMQArtemisService();
    try {
      for (const target of plan.targets) {
        try {
          if (target.sourcePodcastIndexId !== target.podcastIndexId) {
            logger.info(
              `${LOG_PREFIX} listed podcast_index_id=${target.sourcePodcastIndexId} was merged into ${target.podcastIndexId}; adding ${target.podcastIndexId}`
            );
          }
          await mqRSSAddFunction(
            artemis,
            {
              ...mqConstantMessageOptions,
              feedUrl: target.feedUrl,
              podcast_index_id: target.podcastIndexId,
              closeAfterSend: false,
            },
            {
              forceParse: false,
              onDemandParserEvent: {
                accountId: null,
                type: null,
                remoteParentPodcastIndexId: null,
              },
              ...(target.sourcePodcastIndexId !== target.podcastIndexId
                ? { catalogAllowlistSourcePodcastIndexId: target.sourcePodcastIndexId }
                : {}),
            }
          );
          enqueued += 1;
        } catch (error) {
          failed += 1;
          logger.error(`${LOG_PREFIX} podcast_index_id=${target.podcastIndexId} failed:`, error);
        }
      }
    } finally {
      try {
        await artemis.close();
      } catch {
        // swallow
      }
    }
  }

  logger.info(
    `${LOG_PREFIX} Done. Listed: ${listedCount}, already stored: ${alreadyStored}, enqueued: ${enqueued}, failed: ${failed}, unavailable: ${formatIdList(plan.unavailable)}, unresolved: ${formatIdList(plan.unresolved)}.`
  );
  if (plan.unresolved.length > 0) {
    logger.warn(`${LOG_PREFIX} Unresolved podcast_index_id: ${plan.unresolved.join(', ')}`);
  }
  if (failed > 0) {
    throw new Error(`${LOG_PREFIX} ${failed} enqueue(s) failed`);
  }
};

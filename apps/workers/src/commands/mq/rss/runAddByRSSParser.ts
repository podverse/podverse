import { randomUUID } from 'node:crypto';

import type { CommandLineArgs } from '@workers/commands/index.js';
import { getAddByRSSConfig } from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import { applyAddByRSSFollowMetadata } from '@workers/lib/addByRSS/applyAddByRSSFollowMetadata.js';
import {
  classifyAddByRSSParseFailure,
  nextRequiresCredentials,
} from '@workers/lib/addByRSS/classifyAddByRSSParseFailure.js';
import {
  fanOutAddByRSSPublisherListedFeeds,
  feedHostForLog,
} from '@workers/lib/addByRSS/fanOutAddByRSSPublisherListedFeeds.js';
import { resolveAddByRSSMessageCredentials } from '@workers/lib/addByRSS/resolveAddByRSSMessageCredentials.js';
import { setAddByRSSParseCacheEntry } from '@workers/lib/addByRSSParseCache.js';

import type {
  AddByRSSParseCredentialsState,
  AddByRSSPublisherListedFeed,
  MQQueueNameParamKey,
} from '@podverse/helpers';
import { MQ_QUEUES, sleep } from '@podverse/helpers';
import { sealAddByRssCredentials } from '@podverse/helpers-backend';
import type { MQAddByRSSMessage } from '@podverse/mq';
import { createActiveMQShutdown, mqAddByRSSAdd } from '@podverse/mq';
import {
  AccountFollowingAddByRSSChannelService,
  ChannelAddByRSSDirectoryMatchService,
  findBlockedFeed,
} from '@podverse/orm';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';
import { parseRSSFeedForAddByRSS } from '@podverse/parser';

const allowedQueueParamKeys: MQQueueNameParamKey[] = [
  'add-by-rss-on-demand',
  'add-by-rss-background',
];

const lookUpFeedUrlsByGuid = async (guids: string[]): Promise<ReadonlyMap<string, string>> => {
  const response = await getPodcastIndexService().podcastsBatchByFeedGuid(guids);
  const feedUrlByGuid = new Map<string, string>();
  for (const feed of Array.isArray(response?.feeds) ? response.feeds : []) {
    if (
      typeof feed.podcastGuid === 'string' &&
      feed.podcastGuid !== '' &&
      typeof feed.url === 'string' &&
      feed.url !== ''
    ) {
      feedUrlByGuid.set(feed.podcastGuid.toLowerCase(), feed.url);
    }
  }
  return feedUrlByGuid;
};

export const mqAddByRSSRunParser = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as
    MQQueueNameParamKey | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!allowedQueueParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(`Invalid queueName. Allowed values are: ${allowedQueueParamKeys.join(', ')}`);
  }

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];
  const activeMQArtemisService = getActiveMQArtemisService();
  const loggerService = getLoggerService();
  const addByRSSConfig = getAddByRSSConfig();
  const isDev = process.env.NODE_ENV === 'development';

  const updateRequiresCredentials = async (
    accountId: number,
    feedUrl: string,
    value: boolean | undefined
  ): Promise<void> => {
    if (value === undefined) {
      return;
    }
    try {
      await new AccountFollowingAddByRSSChannelService().setRequiresCredentials(
        accountId,
        feedUrl,
        value
      );
    } catch (error) {
      loggerService.logError('mqAddByRSSRunParser: failed to update requires_credentials', error);
    }
  };

  /**
   * Album messages go to the background queue with dedupe off: broker dedupe keys on the feed URL
   * alone, so another member's artist listing the same album would drop this member's message.
   */
  const fanOutPublisherListedFeeds = async (params: {
    accountId: number;
    requestId: string;
    feedUrl: string;
    parsedFeed: Extract<ParseRSSFeedForAddByRSSResult, { status: 'parsed' }>['parsedFeed'];
    credentialsState: AddByRSSParseCredentialsState;
    basicAuth: { username: string; password: string } | undefined;
  }): Promise<AddByRSSPublisherListedFeed[] | undefined> => {
    const { basicAuth } = params;
    return fanOutAddByRSSPublisherListedFeeds(
      {
        accountId: params.accountId,
        requestId: params.requestId,
        feedUrl: params.feedUrl,
        parsedFeed: params.parsedFeed,
        credentialsState: params.credentialsState,
        hasCredentials: basicAuth !== undefined,
        allowInsecure: addByRSSConfig.allowInsecureCredentials,
      },
      {
        findDirectoryChannels: (refs) =>
          new ChannelAddByRSSDirectoryMatchService().getForListedFeeds(refs),
        lookUpFeedUrlsByGuid,
        setCacheEntry: setAddByRSSParseCacheEntry,
        enqueue: (options) =>
          mqAddByRSSAdd(activeMQArtemisService, {
            ...MQ_QUEUES['add-by-rss-background'],
            dedupeCacheTimeMS: null,
            ...options,
            closeAfterSend: false,
          }),
        sealCredentials: (aad) => {
          if (basicAuth === undefined) {
            throw new Error('mqAddByRSSRunParser: no credentials to seal for a listed feed');
          }
          return sealAddByRssCredentials(
            { username: basicAuth.username, password: basicAuth.password, ...aad },
            addByRSSConfig.credentialsEncryptionKey
          );
        },
        newRequestId: randomUUID,
        now: () => new Date(),
        logWarn: (logMessage, context) => loggerService.warn(logMessage, context),
        logError: (logMessage, error) => loggerService.logError(logMessage, error),
      }
    );
  };

  await activeMQArtemisService.initialize();

  await activeMQArtemisService.consumeMessages(
    mqConstantMessageOptions.queueName,
    async (context, receiver) => {
      const bodyStr = (context.message?.body as string) ?? '';
      let message: MQAddByRSSMessage | null = null;

      try {
        message = JSON.parse(bodyStr) as MQAddByRSSMessage;
        const { accountId, feedUrl, requestId, feedHash, etag, lastModified } = message;

        if (!accountId || !feedUrl || !requestId) {
          throw new Error(
            `Missing required AddByRSS fields in message for requestId ${String(requestId)}`
          );
        }

        const { publisherRequestId } = message;
        const publisherRef = publisherRequestId !== undefined ? { publisherRequestId } : {};

        await setAddByRSSParseCacheEntry({
          requestId,
          accountId,
          feedUrl,
          status: 'processing',
          ...publisherRef,
          cache: {
            feedHash,
            etag,
            lastModified,
          },
          updatedAt: new Date().toISOString(),
        });

        if (isDev) {
          loggerService.info('mqAddByRSSRunParser: parse started', {
            accountId,
            requestId,
            queueName: mqConstantMessageOptions.queueName,
          });
        }

        const resolvedCredentials = resolveAddByRSSMessageCredentials({
          accountId,
          requestId,
          feedUrl,
          credentialsEnvelope: message.credentialsEnvelope,
          credentialsWithheld: message.credentialsWithheld,
          keyHex: addByRSSConfig.credentialsEncryptionKey,
          keyHexOld: addByRSSConfig.credentialsEncryptionKeyOld,
          allowInsecure: addByRSSConfig.allowInsecureCredentials,
        });
        let credentialsState: AddByRSSParseCredentialsState = resolvedCredentials.credentialsState;

        const blockedFeed = await findBlockedFeed({ url: feedUrl });
        let result: ParseRSSFeedForAddByRSSResult | undefined;
        let fetchError: unknown;
        if (blockedFeed !== null) {
          result = { status: 'failed', error: 'This feed is blocked.' };
          // The account sees a failed parse. Opening the envelope is not part of that result.
          credentialsState = 'not_provided';
        } else if (credentialsState !== 'decrypt_failed') {
          try {
            result = await parseRSSFeedForAddByRSS(feedUrl, {
              feedHash,
              etag,
              lastModified,
              basicAuth: resolvedCredentials.basicAuth,
              allowInsecureCredentials: addByRSSConfig.allowInsecureCredentials,
              onCredentialsWithheld: (decision) => {
                credentialsState = decision;
              },
            });
          } catch (error) {
            fetchError = error;
          }
        }

        if (result?.status === 'parsed' || result?.status === 'not_modified') {
          let publisherListedFeeds: AddByRSSPublisherListedFeed[] | undefined;
          if (result.status === 'parsed' && publisherRequestId === undefined) {
            try {
              publisherListedFeeds = await fanOutPublisherListedFeeds({
                accountId,
                requestId,
                feedUrl,
                parsedFeed: result.parsedFeed,
                credentialsState,
                basicAuth: resolvedCredentials.basicAuth,
              });
            } catch (error) {
              loggerService.logError('mqAddByRSSRunParser: publisher fan-out failed', error);
            }
          }

          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: result.status,
            ...(result.status === 'parsed' ? { payload: result.parsedFeed } : {}),
            cache: result.cache,
            credentialsState,
            ...(publisherListedFeeds !== undefined ? { publisherListedFeeds } : {}),
            ...publisherRef,
            updatedAt: new Date().toISOString(),
          });
          await updateRequiresCredentials(
            accountId,
            feedUrl,
            nextRequiresCredentials({ status: 'succeeded', credentialsState })
          );
          await applyAddByRSSFollowMetadata({
            accountId,
            feedUrl,
            result,
            setFeedMetadata: (id, url, metadata) =>
              new AccountFollowingAddByRSSChannelService().setFeedMetadata(id, url, metadata),
            onError: (error) => {
              loggerService.logError(
                'mqAddByRSSRunParser: failed to update follow title and image',
                error
              );
            },
          });
        } else {
          const failure = classifyAddByRSSParseFailure({ error: fetchError, credentialsState });
          const errorMessage =
            result?.status === 'failed'
              ? result.error
              : fetchError instanceof Error
                ? fetchError.message
                : 'Feed credentials could not be opened.';

          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: 'failed',
            error: errorMessage,
            failureReason: failure.failureReason,
            ...(failure.httpStatus !== undefined ? { httpStatus: failure.httpStatus } : {}),
            authChallenge: failure.authChallenge,
            credentialsState,
            ...publisherRef,
            updatedAt: new Date().toISOString(),
          });
          loggerService.warn('mqAddByRSSRunParser: parse failed', {
            requestId,
            accountId,
            feedHost: feedHostForLog(feedUrl),
            httpStatus: failure.httpStatus,
            failureReason: failure.failureReason,
            credentialsState,
          });
          await updateRequiresCredentials(
            accountId,
            feedUrl,
            nextRequiresCredentials({ status: 'failed', failureReason: failure.failureReason })
          );
        }

        if (isDev) {
          loggerService.info('mqAddByRSSRunParser: parse finished', {
            accountId,
            requestId,
            queueName: mqConstantMessageOptions.queueName,
            status: result?.status ?? 'failed',
          });
        }

        context.delivery?.accept();
        receiver.add_credit(1);
      } catch (error) {
        if (isDev) {
          loggerService.info('mqAddByRSSRunParser: processing error', {
            accountId: message?.accountId,
            requestId: message?.requestId,
            queueName: mqConstantMessageOptions.queueName,
          });
        }
        loggerService.logError('mqAddByRSSRunParser: error processing message', error as Error);
        try {
          if (message?.accountId && message?.feedUrl && message?.requestId) {
            await setAddByRSSParseCacheEntry({
              requestId: message.requestId,
              accountId: message.accountId,
              feedUrl: message.feedUrl,
              status: 'failed',
              error: (error as Error).message,
              ...(message.publisherRequestId !== undefined
                ? { publisherRequestId: message.publisherRequestId }
                : {}),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (cacheError) {
          loggerService.logError(
            'mqAddByRSSRunParser: failed to update cache entry',
            cacheError as Error
          );
        }
        context.delivery?.reject({
          condition: 'podverse:processing-error',
          description: (error as Error).message,
        });
        receiver.add_credit(1);
      }
    }
  );

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(activeMQArtemisService, console, () => {
    keepRunning = false;
  });

  while (keepRunning) {
    await sleep(1000);
  }

  unregister();
};

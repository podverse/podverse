import type { CommandLineArgs } from '@workers/commands/index.js';
import { getAddByRSSConfig } from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import {
  classifyAddByRSSParseFailure,
  nextRequiresCredentials,
} from '@workers/lib/addByRSS/classifyAddByRSSParseFailure.js';
import {
  resolveAddByRSSMessageCredentials,
} from '@workers/lib/addByRSS/resolveAddByRSSMessageCredentials.js';
import { setAddByRSSParseCacheEntry } from '@workers/lib/addByRSSParseCache.js';

import type { AddByRSSParseCredentialsState, MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, sleep } from '@podverse/helpers';
import type { MQAddByRSSMessage } from '@podverse/mq';
import { createActiveMQShutdown } from '@podverse/mq';
import { AccountFollowingAddByRSSChannelService } from '@podverse/orm';
import type { ParseRSSFeedForAddByRSSResult } from '@podverse/parser';
import { parseRSSFeedForAddByRSS } from '@podverse/parser';

const allowedQueueParamKeys: MQQueueNameParamKey[] = [
  'add-by-rss-on-demand',
  'add-by-rss-background',
];

/** Host only: log lines never carry the path, query, or userinfo of a private feed URL. */
const feedHostForLog = (feedUrl: string): string => {
  try {
    return new URL(feedUrl).host;
  } catch {
    return 'invalid-url';
  }
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

        await setAddByRSSParseCacheEntry({
          requestId,
          accountId,
          feedUrl,
          status: 'processing',
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
          keyHex: addByRSSConfig.credentialsEncryptionKey,
          keyHexOld: addByRSSConfig.credentialsEncryptionKeyOld,
          allowInsecure: addByRSSConfig.allowInsecureCredentials,
        });
        let credentialsState: AddByRSSParseCredentialsState = resolvedCredentials.credentialsState;

        let result: ParseRSSFeedForAddByRSSResult | undefined;
        let fetchError: unknown;
        if (credentialsState !== 'decrypt_failed') {
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
          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: result.status,
            ...(result.status === 'parsed' ? { payload: result.parsedFeed } : {}),
            cache: result.cache,
            credentialsState,
            updatedAt: new Date().toISOString(),
          });
          await updateRequiresCredentials(
            accountId,
            feedUrl,
            nextRequiresCredentials({ status: 'succeeded', credentialsState })
          );
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

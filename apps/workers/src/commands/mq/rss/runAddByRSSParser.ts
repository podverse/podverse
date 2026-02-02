import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { setAddByRSSParseCacheEntry } from '@workers/lib/addByRSSParseCache.js';

import { parseRSSFeedForAddByRSS } from '@podverse/parser';
import type { MQAddByRSSMessage } from '@podverse/mq';
import { createActiveMQShutdown } from '@podverse/mq';

export const mqAddByRSSRunParser = async (_args: CommandLineArgs) => {
  const activeMQArtemisService = getActiveMQArtemisService();
  const loggerService = getLoggerService();

  await activeMQArtemisService.initialize();

  await activeMQArtemisService.consumeMessages(
    'add-by-rss-on-demand',
    async (context, receiver) => {
      const bodyStr = (context.message?.body as string) ?? '';
      let message: MQAddByRSSMessage | null = null;

      try {
        message = JSON.parse(bodyStr) as MQAddByRSSMessage;
        const { accountId, feedUrl, requestId, feedHash, etag, lastModified } = message;

        if (!accountId || !feedUrl || !requestId) {
          throw new Error(`Missing required AddByRSS fields in message ${bodyStr}`);
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

        const result = await parseRSSFeedForAddByRSS(feedUrl, {
          feedHash,
          etag,
          lastModified,
        });

        if (result.status === 'parsed') {
          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: 'parsed',
            payload: result.parsedFeed,
            cache: result.cache,
            updatedAt: new Date().toISOString(),
          });
        } else if (result.status === 'not_modified') {
          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: 'not_modified',
            cache: result.cache,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setAddByRSSParseCacheEntry({
            requestId,
            accountId,
            feedUrl,
            status: 'failed',
            error: result.error,
            updatedAt: new Date().toISOString(),
          });
        }

        context.delivery?.accept();
        receiver.add_credit(1);
      } catch (error) {
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  unregister();
};

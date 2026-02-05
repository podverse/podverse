import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import Joi from 'joi';
import { MQ_QUEUES, getDedupeTTLSeconds, getRecordValue } from '@podverse/helpers';
import { mqAddByRSSAdd, mqAddByRSSAddAll } from '@podverse/mq';
import { config } from '@api/config/index.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { handleGenericErrorResponse } from '../helpers/error.js';
import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { loggerService } from '@api/factories/loggerService.js';
import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject, validateParamsObject } from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  getAddByRSSParseCacheEntry,
  setAddByRSSParseCacheEntry,
} from '@api/lib/addByRSSParseCache.js';

type FeedHashMap = Record<string, string>;

const buildAddByRSSDedupeKey = (accountId: number, feedUrl: string): string =>
  `addByRSS:dedupe:${accountId}:${encodeURIComponent(feedUrl)}`;

const enqueueRateLimit = rateLimitAuthEndpoint({
  windowMs: 60 * 60 * 1000,
  max: 20,
});

class AccountAddByRSSParseController {
  static async enqueueParse(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        enqueueRateLimit(req, res, () => {
          const bodySchema = Joi.object({
            feed_url: Joi.string().uri().required(),
            feed_hash: Joi.string().optional(),
            etag: Joi.string().optional(),
            last_modified: Joi.string().optional(),
          });

          validateBodyObject(bodySchema, req, res, async () => {
            const account = getAuthenticatedUser(req);
            const requestId = randomUUID();
            const { feed_url, feed_hash, etag, last_modified } = req.body;
            const mqConstantMessageOptions = MQ_QUEUES['add-by-rss-on-demand'];
            const dedupeTTLSeconds = getDedupeTTLSeconds(
              mqConstantMessageOptions.dedupeCacheTimeMS
            );

            try {
              if (dedupeTTLSeconds) {
                const dedupeKey = buildAddByRSSDedupeKey(account.id, feed_url);
                const existing = await cacheGetJson<{ createdAt: string }>(dedupeKey);
                if (existing) {
                  res.status(429).json({
                    message: 'Duplicate request. Please wait before retrying.',
                    retry_after_seconds: dedupeTTLSeconds,
                  });
                  return;
                }

                await cacheSetJson(
                  dedupeKey,
                  { createdAt: new Date().toISOString() },
                  dedupeTTLSeconds
                );
              }

              if (process.env.MQ_DEBUG === 'true') {
                loggerService.info('Add-by-RSS enqueue debug', {
                  queueName: mqConstantMessageOptions.queueName,
                  host: config.activeMQArtemis.host,
                  port: config.activeMQArtemis.port,
                  protocol: config.activeMQArtemis.protocol,
                  requestId,
                  feedUrl: feed_url,
                  dedupeTTLSeconds,
                });
              }

              await mqAddByRSSAdd(activeMQArtemisService, {
                ...mqConstantMessageOptions,
                accountId: account.id,
                feedUrl: feed_url,
                requestId,
                feedHash: feed_hash || undefined,
                etag: etag || undefined,
                lastModified: last_modified || undefined,
                closeAfterSend: false,
              });

              await setAddByRSSParseCacheEntry({
                requestId,
                accountId: account.id,
                feedUrl: feed_url,
                status: 'queued',
                cache: {
                  feedHash: feed_hash || undefined,
                  etag: etag || undefined,
                  lastModified: last_modified || undefined,
                },
                updatedAt: new Date().toISOString(),
              });

              res.status(201).json({ request_id: requestId });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      { skipMembershipStatus: false, noFreeTrial: true }
    );
  }

  static async enqueueParseAll(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        enqueueRateLimit(req, res, () => {
          const bodySchema = Joi.object({
            feed_hashes_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            etags_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            last_modified_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
          });

          validateBodyObject(bodySchema, req, res, async () => {
            const account = getAuthenticatedUser(req);
            const mqConstantMessageOptions = MQ_QUEUES['add-by-rss-on-demand'];
            const requestIds: Array<{ request_id: string; feed_url: string }> = [];
            const feedHashesByUrl = req.body.feed_hashes_by_url as FeedHashMap | undefined;
            const etagsByUrl = req.body.etags_by_url as FeedHashMap | undefined;
            const lastModifiedByUrl = req.body.last_modified_by_url as FeedHashMap | undefined;
            const requestIdGenerator = (feedUrl: string) => {
              const requestId = randomUUID();
              requestIds.push({ request_id: requestId, feed_url: feedUrl });
              return requestId;
            };

            try {
              await mqAddByRSSAddAll(activeMQArtemisService, {
                ...mqConstantMessageOptions,
                accountId: account.id,
                feedHashesByUrl,
                etagsByUrl,
                lastModifiedByUrl,
                requestIdGenerator,
                closeAfterSend: false,
              });

              for (const { request_id, feed_url } of requestIds) {
                await setAddByRSSParseCacheEntry({
                  requestId: request_id,
                  accountId: account.id,
                  feedUrl: feed_url,
                  status: 'queued',
                  cache: {
                    feedHash: getRecordValue(feedHashesByUrl, feed_url),
                    etag: getRecordValue(etagsByUrl, feed_url),
                    lastModified: getRecordValue(lastModifiedByUrl, feed_url),
                  },
                  updatedAt: new Date().toISOString(),
                });
              }

              res.status(201).json({ request_ids: requestIds });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      { skipMembershipStatus: false, noFreeTrial: true }
    );
  }

  static async getParseStatus(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateParamsObject(
          Joi.object({ request_id: Joi.string().required() }),
          req,
          res,
          async () => {
            const account = getAuthenticatedUser(req);
            const requestId = getParamRequired(req, 'request_id');

            try {
              const cached = await getAddByRSSParseCacheEntry(requestId);
              if (!cached || cached.accountId !== account.id) {
                res.status(404).json({ message: 'Request not found.' });
                return;
              }

              res.json(cached);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          }
        );
      },
      { skipMembershipStatus: false, noFreeTrial: true }
    );
  }
}

export { AccountAddByRSSParseController };

import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { loggerService } from '@api/factories/loggerService.js';
import type { AddByRSSParseCacheEntry } from '@api/lib/addByRSSParseCache.js';
import {
  getAddByRSSParseCacheEntry,
  setAddByRSSParseCacheEntry,
} from '@api/lib/addByRSSParseCache.js';
import {
  getAddByRSSParseDedupeEntry,
  setAddByRSSParseDedupeEntry,
} from '@api/lib/addByRSSParseDedupeCache.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { joiFeedUrl, validateBodyObject, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  getDedupeTTLSeconds,
  getRecordValue,
  MQ_QUEUES,
} from '@podverse/helpers';
import { mqAddByRSSAdd } from '@podverse/mq';
import { AccountFollowingAddByRSSChannelService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

type FeedHashMap = Record<string, string>;

/** Sync with apps/web/e2e/helpers/seedConstants.ts / tools/web/seed-e2e.mjs (mobile E2E fixtures). */
const E2E_ADD_BY_RSS_CHANNEL_TITLE = 'E2E Add-by-RSS Channel';
const E2E_ADD_BY_RSS_ITEM_IMAGE_URL = 'https://e2e-seed-addbyrss.example/item-art.png';
const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL =
  'http://localhost:2111/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3';

/**
 * Minimal payload for mobile `extractPreviewFromParsePayload`. Cache entry is typed as
 * partytime FeedObject; E2E only needs items[0] title / enclosure.url / image.url.
 * Cast via unknown: fixture is intentionally not a full FeedObject.
 */
const buildE2eParsedFeedPayload = (): NonNullable<AddByRSSParseCacheEntry['payload']> => {
  const fixture = {
    items: [
      {
        title: E2E_ADD_BY_RSS_CHANNEL_TITLE,
        enclosure: { url: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL },
        image: { url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL },
        playback_position: '0',
      },
    ],
  };
  return fixture as unknown as NonNullable<AddByRSSParseCacheEntry['payload']>;
};

const enqueueRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountAddByRssParseEnqueue.windowMs,
  max: config.rateLimits.accountAddByRssParseEnqueue.max,
});

class AccountAddByRSSParseController {
  static async enqueueParse(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        enqueueRateLimit(req, res, () => {
          const bodySchema = Joi.object({
            feed_url: joiFeedUrl(),
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
                const existing = await getAddByRSSParseDedupeEntry(account.id, feed_url);
                if (existing) {
                  res.status(429).json({
                    message: 'Duplicate request. Please wait before retrying.',
                    retry_after_seconds: dedupeTTLSeconds,
                  });
                  return;
                }

                await setAddByRSSParseDedupeEntry(account.id, feed_url, dedupeTTLSeconds);
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

              if (config.e2e.fixturesEnabled) {
                // Mobile E2E stack has no MQ/worker — resolve parse synchronously.
                await setAddByRSSParseCacheEntry({
                  requestId,
                  accountId: account.id,
                  feedUrl: feed_url,
                  status: 'parsed',
                  cache: {
                    feedHash: feed_hash || undefined,
                    etag: etag || undefined,
                    lastModified: last_modified || undefined,
                  },
                  payload: buildE2eParsedFeedPayload(),
                  updatedAt: new Date().toISOString(),
                });
                res.status(201).json({ request_id: requestId });
                return;
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
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
      }
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
            const dedupedFeedUrls: string[] = [];
            const feedHashesByUrl = req.body.feed_hashes_by_url as FeedHashMap | undefined;
            const etagsByUrl = req.body.etags_by_url as FeedHashMap | undefined;
            const lastModifiedByUrl = req.body.last_modified_by_url as FeedHashMap | undefined;
            const dedupeTTLSeconds = getDedupeTTLSeconds(
              mqConstantMessageOptions.dedupeCacheTimeMS
            );

            try {
              const addByRSSChannelService = new AccountFollowingAddByRSSChannelService();
              const feeds = await addByRSSChannelService.getFollowedAddByRSSChannels(account.id);

              for (const feed of feeds) {
                const feedUrl = feed.feed_url;

                if (dedupeTTLSeconds) {
                  const existing = await getAddByRSSParseDedupeEntry(account.id, feedUrl);
                  if (existing) {
                    dedupedFeedUrls.push(feedUrl);
                    continue;
                  }
                  await setAddByRSSParseDedupeEntry(account.id, feedUrl, dedupeTTLSeconds);
                }

                const requestId = randomUUID();
                requestIds.push({ request_id: requestId, feed_url: feedUrl });

                await mqAddByRSSAdd(activeMQArtemisService, {
                  ...mqConstantMessageOptions,
                  accountId: account.id,
                  feedUrl,
                  requestId,
                  feedHash: getRecordValue(feedHashesByUrl, feedUrl),
                  etag: getRecordValue(etagsByUrl, feedUrl),
                  lastModified: getRecordValue(lastModifiedByUrl, feedUrl),
                  closeAfterSend: false,
                });

                await setAddByRSSParseCacheEntry({
                  requestId,
                  accountId: account.id,
                  feedUrl,
                  status: 'queued',
                  cache: {
                    feedHash: getRecordValue(feedHashesByUrl, feedUrl),
                    etag: getRecordValue(etagsByUrl, feedUrl),
                    lastModified: getRecordValue(lastModifiedByUrl, feedUrl),
                  },
                  updatedAt: new Date().toISOString(),
                });
              }

              res.status(201).json({
                request_ids: requestIds,
                deduped_feed_urls: dedupedFeedUrls,
                dedupe_ttl_seconds: dedupeTTLSeconds ?? null,
              });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
      }
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
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
      }
    );
  }
}

export { AccountAddByRSSParseController };

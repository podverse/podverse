import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';
import { resolveE2eOpmlImportFeed } from '@api/lib/opml/e2eOpmlImportFixture.js';
import { parseOpml } from '@api/lib/opml/parseOpml.js';
import { getOpmlImportCacheEntry, setOpmlImportCacheEntry } from '@api/lib/opmlImportCache.js';
import { getParamRequired } from '@api/lib/params.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  type CacheSetJson,
  emptyOpmlImportTotals,
  MQ_QUEUES,
  OPML_IMPORT_ERROR_CODES,
} from '@podverse/helpers';
import { mqOpmlImportAdd, processOpmlImportJob } from '@podverse/mq';

import { handleGenericErrorResponse } from '../helpers/error.js';

const MAX_OPML_BODY_CHARS = 1_000_000;
const MAX_OPML_FEEDS = 1000;

/**
 * Exported so integration tests can reset the in-memory per-user counter between
 * cases (the burn-in test intentionally exhausts it). Not used elsewhere at runtime.
 */
export const opmlImportEnqueueRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountOpmlImportEnqueue.windowMs,
  max: config.rateLimits.accountOpmlImportEnqueue.max,
});

const cacheSetJsonAdapter: CacheSetJson = (key, value, ttlSeconds) =>
  cacheSetJson(key, value, ttlSeconds ?? undefined);

const opmlBodyTooLargeResponse = (opmlCharCount: number) => ({
  code: OPML_IMPORT_ERROR_CODES.BODY_TOO_LARGE,
  message:
    `OPML content is too large for a single import request. ` +
    `Maximum characters allowed: ${MAX_OPML_BODY_CHARS}. Received: ${opmlCharCount}. ` +
    `Use a smaller OPML file or split it into multiple imports.`,
  opml_max_body_chars: MAX_OPML_BODY_CHARS,
  opml_received_body_chars: opmlCharCount,
});

const opmlTooManyFeedsResponse = (feedCount: number) => ({
  code: OPML_IMPORT_ERROR_CODES.TOO_MANY_FEEDS,
  message:
    `OPML contains too many feeds for one import request. ` +
    `Maximum feeds allowed: ${MAX_OPML_FEEDS}. Received: ${feedCount}. ` +
    `Split the OPML file into smaller batches and try again.`,
  opml_max_feeds: MAX_OPML_FEEDS,
  opml_received_feeds: feedCount,
});

const extractOpmlXml = (req: Request): string | null => {
  if (typeof req.body === 'string') {
    return req.body;
  }
  if (req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const opml = Reflect.get(req.body, 'opml');
    if (typeof opml === 'string') {
      return opml;
    }
  }
  return null;
};

class AccountOpmlImportController {
  static async enqueueImport(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        opmlImportEnqueueRateLimit(req, res, () => {
          // text/xml (and friends) arrive as a raw string via bodyParser.text.
          if (typeof req.body === 'string') {
            req.body = { opml: req.body };
          }

          const bodySchema = Joi.object({
            opml: Joi.string().min(1).required(),
          });

          validateBodyObject(bodySchema, req, res, async () => {
            const account = getAuthenticatedUser(req);
            const requestId = randomUUID();
            const opmlXml = extractOpmlXml(req);

            if (opmlXml === null || opmlXml.trim() === '') {
              res.status(400).json({
                code: OPML_IMPORT_ERROR_CODES.BODY_REQUIRED,
                message: 'OPML content is required.',
              });
              return;
            }
            if (opmlXml.length > MAX_OPML_BODY_CHARS) {
              res.status(400).json(opmlBodyTooLargeResponse(opmlXml.length));
              return;
            }

            try {
              const feeds = parseOpml(opmlXml);
              if (feeds.length === 0) {
                res.status(400).json({
                  code: OPML_IMPORT_ERROR_CODES.NO_VALID_FEEDS,
                  message: 'No valid feed URLs found in OPML.',
                });
                return;
              }
              if (feeds.length > MAX_OPML_FEEDS) {
                res.status(400).json(opmlTooManyFeedsResponse(feeds.length));
                return;
              }

              await setOpmlImportCacheEntry({
                requestId,
                accountId: account.id,
                status: 'queued',
                totals: emptyOpmlImportTotals(feeds.length),
                results: [],
                updatedAt: new Date().toISOString(),
              });

              if (config.e2e.fixturesEnabled) {
                // Mobile/web E2E stacks may not run MQ workers — resolve synchronously.
                // Use a deterministic local resolver so we never touch Podcast Index
                // over the network (keeps E2E hermetic and non-flaky).
                await processOpmlImportJob({
                  accountId: account.id,
                  requestId,
                  feeds,
                  maxFeedsPerHour: config.opmlImport.maxFeedsPerHour,
                  cacheGetJson,
                  cacheSetJson: cacheSetJsonAdapter,
                  activeMQArtemisService,
                  podcastGetByFeedUrl: resolveE2eOpmlImportFeed,
                  enqueueDownstreamJobs: false,
                });
                res.status(201).json({ request_id: requestId });
                return;
              }

              const mqConstantMessageOptions = MQ_QUEUES['opml-import'];
              await mqOpmlImportAdd(activeMQArtemisService, {
                ...mqConstantMessageOptions,
                accountId: account.id,
                requestId,
                feeds,
                closeAfterSend: false,
              });

              res.status(201).json({ request_id: requestId });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getImportStatus(req: Request, res: Response): Promise<void> {
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
              const cached = await getOpmlImportCacheEntry(requestId);
              if (!cached || cached.accountId !== account.id) {
                res.status(404).json({
                  code: OPML_IMPORT_ERROR_CODES.REQUEST_NOT_FOUND,
                  message: 'Request not found.',
                });
                return;
              }

              res.json(cached);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          }
        );
      },
      { skipMembershipStatus: true }
    );
  }
}

export { AccountOpmlImportController };

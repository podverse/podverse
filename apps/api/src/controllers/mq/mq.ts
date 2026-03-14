import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { OnDemandParserEventType } from '@podverse/helpers';
import { getDedupeTTLSeconds, MQ_QUEUES } from '@podverse/helpers';
import { mqRSSAdd } from '@podverse/mq';

import { handleGenericErrorResponse } from '../helpers/error.js';

const buildRSSOnDemandDedupeKey = (
  accountId: number,
  type: OnDemandParserEventType,
  feedUrl: string
): string => `rss:on-demand:dedupe:${accountId}:${type}:${encodeURIComponent(feedUrl)}`;

export class MQController {
  static rssOnDemandMiddleware = rateLimitAuthEndpoint({
    windowMs: 60 * 60 * 1000,
    max: 20,
  });

  static rssAddToOnDemandMQ(type: OnDemandParserEventType) {
    return async (req: Request, res: Response): Promise<void> => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          MQController.rssOnDemandMiddleware(req, res, () => {
            const bodySchema = Joi.object({
              url: Joi.string().uri().required(),
              podcast_index_id: Joi.number().min(1).required(),
            });

            validateBodyObject(bodySchema, req, res, async () => {
              const dto = req.body;
              const finalDto = {
                url: dto.url,
                podcast_index_id: dto.podcast_index_id,
              };

              try {
                const mqConstantMessageOptions = MQ_QUEUES['rss-on-demand'];
                const dedupeTTLSeconds = getDedupeTTLSeconds(
                  mqConstantMessageOptions.dedupeCacheTimeMS
                );
                const accountId = getAuthenticatedUser(req).id;

                if (dedupeTTLSeconds) {
                  const dedupeKey = buildRSSOnDemandDedupeKey(accountId, type, finalDto.url);
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

                await mqRSSAdd(
                  activeMQArtemisService,
                  {
                    ...mqConstantMessageOptions,
                    feedUrl: finalDto.url,
                    podcast_index_id: finalDto.podcast_index_id,
                    closeAfterSend: false,
                  },
                  {
                    forceParse: false,
                    onDemandParserEvent: {
                      accountId,
                      remoteParentPodcastIndexId: null,
                      type: type,
                    },
                  }
                );
                res.status(201).json({ message: 'Feed added to on-demand queue successfully.' });
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        },
        { skipMembershipStatus: false, noFreeTrial: true }
      );
    };
  }
}

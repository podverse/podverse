import type { Request, Response } from 'express';
import Joi from 'joi';
import type { OnDemandParserEventType } from '@podverse/helpers';
import { MQ_QUEUES } from '@podverse/helpers';
import { mqRSSAdd } from '@podverse/mq';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import { handleGenericErrorResponse } from '../helpers/error.js';
import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';

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
                      accountId: getAuthenticatedUser(req).id,
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

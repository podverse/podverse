import { verifyQueueOwnership } from '@api/controllers/queue/queue.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import { queueIdTextParamSchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { DTOQueueResourceAbridgedResponseData } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import type { QueueResource } from '@podverse/orm';
import { QueueResourceService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';
import { getPaginationParams } from '../helpers/pagination.js';

class QueueResourceController {
  private static queueResourceService = new QueueResourceService();

  static async getAllByAccountAbridged(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const account = getAuthenticatedUser(req);

        try {
          const queueResources =
            await QueueResourceController.queueResourceService.getAllByAccountAbridged(account.id);

          const minimized = queueResources.map((row: DTOQueueResourceAbridgedResponseData) =>
            Object.fromEntries(Object.entries(row).filter(([_, v]) => v !== null && v !== false))
          );

          res.status(200).json(minimized);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async getNowPlayingByQueueIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');

            try {
              const queueResources =
                await QueueResourceController.queueResourceService.getNowPlayingByQueueIdText(
                  queue_id_text
                );
              res.status(200).json(queueResources);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async getAllUpcomingByQueueIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');

            try {
              const queueResources =
                await QueueResourceController.queueResourceService.getAllUpcomingByQueueIdText(
                  queue_id_text
                );
              res.status(200).json(queueResources);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async getHistoryResourcesByQueueIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const { page, limit, offset } = getPaginationParams(req);

            try {
              const queueResources =
                await QueueResourceController.queueResourceService.getHistoryResourcesByQueueIdText(
                  queue_id_text,
                  {
                    skip: offset,
                    take: limit,
                  }
                );

              const response: ApiListResponse<QueueResource> = {
                data: queueResources[0],
                meta: { page, count: queueResources[1], limit },
              };

              res.status(200).json(response);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

export { QueueResourceController };

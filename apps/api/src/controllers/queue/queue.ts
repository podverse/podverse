import { NextFunction, Request, Response } from 'express';
import { QueueService } from '@podverse/orm';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';
import { handleGenericErrorResponse } from '../helpers/error';
import Joi from 'joi';
import {
  queueIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation';
import { getParamRequired } from '@api/lib/params';

const queueService = new QueueService();

export const verifyQueueOwnership = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const account = getAuthenticatedUser(req);
    const queue_id_text = getParamRequired(req, 'queue_id_text');

    try {
      const queue = await queueService.getByIdText(queue_id_text, { relations: ['account'] });
      if (!queue) {
        res.status(404).json({ message: 'Queue not found' });
        return;
      }

      if (queue.account.id !== account.id) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      next();
    } catch (err) {
      handleGenericErrorResponse(res, err);
    }
  };
};

class QueueController {
  private static queueService = new QueueService();

  static async getAllPrivate(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const account = getAuthenticatedUser(req);
          const queues = await QueueController.queueService.getAllPrivate(account.id, {
            relations: ['medium'],
          });
          res.status(200).json(queues);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async updateIsActiveQueue(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        verifyQueueOwnership()(req, res, async () => {
          const bodySchema = Joi.object({
            is_active_queue: Joi.boolean().required(),
          });

          validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const account = getAuthenticatedUser(req);
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { is_active_queue } = req.body;

              if (typeof is_active_queue !== 'boolean') {
                res.status(400).json({ message: 'Invalid is_active_queue value' });
                return;
              }

              try {
                await QueueController.queueService.updateIsActiveQueue(
                  account.id,
                  queue_id_text,
                  is_active_queue
                );
                res.status(200).json({ message: 'Queue updated successfully' });
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        });
      },
      { skipMembershipStatus: true }
    );
  }
}

export { QueueController };

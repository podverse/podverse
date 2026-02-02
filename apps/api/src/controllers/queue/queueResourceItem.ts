import type { Request, Response } from 'express';
import Joi from 'joi';
import { QueueResourceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { verifyQueueOwnership } from '@api/controllers/queue/queue.js';
import {
  itemIdTextParamSchema,
  positionBetweenBodySchema,
  queueIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

export const queueResourceNowPlayingSchema = Joi.object({
  playback_position: Joi.number().min(0).optional(),
  media_file_duration: Joi.number().min(0).optional(),
  completed: Joi.boolean().optional(),
}).required();

class QueueResourceItemController {
  private static queueResourceService = new QueueResourceService();

  static async addItemToNowPlaying(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_id_text = getParamRequired(req, 'item_id_text');

              const { playback_position, media_file_duration, completed } = req.body;

              const dto = {
                ...(playback_position || playback_position === 0 ? { playback_position } : {}),
                ...(media_file_duration || media_file_duration === 0
                  ? { media_file_duration }
                  : {}),
                ...(completed ? { completed } : {}),
              };

              try {
                const queueResource =
                  await QueueResourceItemController.queueResourceService.addItemToNowPlaying(
                    queue_id_text,
                    item_id_text,
                    dto
                  );
                res.status(201).json(queueResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          },
          { skipMembershipStatus: false }
        );
      });
    });
  }

  static async addItemToQueueNext(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_id_text = getParamRequired(req, 'item_id_text');

            try {
              const queueResource =
                await QueueResourceItemController.queueResourceService.addItemToQueueNext(
                  queue_id_text,
                  item_id_text
                );
              res.status(201).json(queueResource);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemToQueueLast(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_id_text = getParamRequired(req, 'item_id_text');

            try {
              const queueResource =
                await QueueResourceItemController.queueResourceService.addItemToQueueLast(
                  queue_id_text,
                  item_id_text
                );
              res.status(201).json(queueResource);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemToQueueBetween(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          validateBodyObject(Joi.object(positionBetweenBodySchema), req, res, async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_id_text = getParamRequired(req, 'item_id_text');
              const { position1, position2 } = req.body;

              try {
                const queueResource =
                  await QueueResourceItemController.queueResourceService.addItemToQueueBetween(
                    queue_id_text,
                    item_id_text,
                    position1,
                    position2
                  );
                res.status(201).json(queueResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemToHistory(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_id_text = getParamRequired(req, 'item_id_text');
              const { playback_position, media_file_duration, completed } = req.body;

              const dto = {
                ...(playback_position || playback_position === 0 ? { playback_position } : {}),
                ...(media_file_duration || media_file_duration === 0
                  ? { media_file_duration }
                  : {}),
                ...(completed ? { completed } : {}),
              };

              try {
                const queueResource =
                  await QueueResourceItemController.queueResourceService.addItemToHistory(
                    queue_id_text,
                    item_id_text,
                    dto
                  );
                res.status(201).json(queueResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          },
          { skipMembershipStatus: false }
        );
      });
    });
  }

  static async removeItemFromQueue(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_id_text = getParamRequired(req, 'item_id_text');

            try {
              await QueueResourceItemController.queueResourceService.removeItemFromQueue(
                queue_id_text,
                item_id_text
              );
              res.status(204).end();
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

export { QueueResourceItemController };

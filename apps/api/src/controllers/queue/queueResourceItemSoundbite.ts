import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { verifyQueueOwnership } from '@api/controllers/queue/queue.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  itemSoundbiteIdTextParamSchema,
  positionBetweenBodySchema,
  queueIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { QueueResourceService } from '@podverse/orm';

import { queueResourceNowPlayingSchema } from './queueResourceItem.js';

class QueueResourceItemSoundbiteController {
  private static queueResourceService = new QueueResourceService();

  static async addItemSoundbiteToQueueNext(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');

            try {
              const queueResource =
                await QueueResourceItemSoundbiteController.queueResourceService.addItemSoundbiteToQueueNext(
                  queue_id_text,
                  item_soundbite_id_text
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

  static async addItemSoundbiteToQueueLast(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');

            try {
              const queueResource =
                await QueueResourceItemSoundbiteController.queueResourceService.addItemSoundbiteToQueueLast(
                  queue_id_text,
                  item_soundbite_id_text
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

  static async addItemSoundbiteToQueueBetween(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          validateBodyObject(Joi.object(positionBetweenBodySchema), req, res, async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');
              const { position1, position2 } = req.body;

              try {
                const queueResource =
                  await QueueResourceItemSoundbiteController.queueResourceService.addItemSoundbiteToQueueBetween(
                    queue_id_text,
                    item_soundbite_id_text,
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

  static async addItemSoundbiteToNowPlaying(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');
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
                  await QueueResourceItemSoundbiteController.queueResourceService.addItemSoundbiteToNowPlaying(
                    queue_id_text,
                    item_soundbite_id_text,
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

  static async addItemSoundbiteToHistory(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');
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
                  await QueueResourceItemSoundbiteController.queueResourceService.addItemSoundbiteToHistory(
                    queue_id_text,
                    item_soundbite_id_text,
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

  static async removeItemSoundbiteFromQueue(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...itemSoundbiteIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');

            try {
              await QueueResourceItemSoundbiteController.queueResourceService.removeItemSoundbiteFromQueue(
                queue_id_text,
                item_soundbite_id_text
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

export { QueueResourceItemSoundbiteController };

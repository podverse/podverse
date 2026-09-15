import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { verifyQueueOwnership } from '@api/controllers/queue/queue.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  clipIdTextParamSchema,
  queueIdTextParamSchema,
  queueRemovalTombstoneBodySchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { QueueResourceService } from '@podverse/orm';

import {
  queueResourceBetweenSchema,
  queueResourceNowPlayingSchema,
  queueResourceQueueWriteSchema,
} from './queueResourceItem.js';

class QueueResourceClipController {
  private static queueResourceService = new QueueResourceService();

  static async addClipToQueueNext(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceQueueWriteSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');

              try {
                const queueResource =
                  await QueueResourceClipController.queueResourceService.addClipToQueueNext(
                    queue_id_text,
                    clip_id_text
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

  static async addClipToQueueLast(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceQueueWriteSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');

              try {
                const queueResource =
                  await QueueResourceClipController.queueResourceService.addClipToQueueLast(
                    queue_id_text,
                    clip_id_text
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

  static async addClipToQueueBetween(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            validateBodyObject(queueResourceBetweenSchema, req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');
              const { position1, position2 } = req.body;

              try {
                const queueResource =
                  await QueueResourceClipController.queueResourceService.addClipToQueueBetween(
                    queue_id_text,
                    clip_id_text,
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

  static async addClipToNowPlaying(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');
              const {
                playback_position,
                media_file_duration,
                completed,
                last_played_at,
                playback_event_kind,
              } = req.body;

              const dto = {
                ...(playback_position || playback_position === 0 ? { playback_position } : {}),
                ...(media_file_duration || media_file_duration === 0
                  ? { media_file_duration }
                  : {}),
                ...(completed !== undefined ? { completed } : {}),
                ...(last_played_at ? { last_played_at } : {}),
                ...(playback_event_kind ? { playback_event_kind } : {}),
              };

              try {
                const queueResource =
                  await QueueResourceClipController.queueResourceService.addClipToNowPlaying(
                    queue_id_text,
                    clip_id_text,
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

  static async addClipToHistory(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueResourceNowPlayingSchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');
              const {
                playback_position,
                media_file_duration,
                completed,
                last_played_at,
                playback_event_kind,
              } = req.body;

              const dto = {
                ...(playback_position || playback_position === 0 ? { playback_position } : {}),
                ...(media_file_duration || media_file_duration === 0
                  ? { media_file_duration }
                  : {}),
                ...(completed !== undefined ? { completed } : {}),
                ...(last_played_at ? { last_played_at } : {}),
                ...(playback_event_kind ? { playback_event_kind } : {}),
              };

              try {
                const queueResource =
                  await QueueResourceClipController.queueResourceService.addClipToHistory(
                    queue_id_text,
                    clip_id_text,
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

  static async removeClipFromQueue(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      ...clipIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateBodyObject(queueRemovalTombstoneBodySchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const clip_id_text = getParamRequired(req, 'clip_id_text');
              const { last_played_at } = req.body;

              try {
                await QueueResourceClipController.queueResourceService.removeClipFromQueue(
                  queue_id_text,
                  clip_id_text,
                  { last_played_at }
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
    });
  }
}

export { QueueResourceClipController };

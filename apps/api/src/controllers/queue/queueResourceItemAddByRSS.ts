import type { Request, Response } from 'express';
import Joi from 'joi';
import { QueueResourceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { verifyQueueOwnership } from '@api/controllers/queue/queue.js';
import {
  positionBetweenBodySchema,
  queueIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

const queueResourceAddByRSSNowPlayingBodySchema = Joi.object({
  add_by_rss_resource_data: Joi.object().required(),
  playback_position: Joi.number().min(0).optional(),
  media_file_duration: Joi.number().min(0).optional(),
  completed: Joi.boolean().optional(),
}).required();

class QueueResourceItemAddByRSSController {
  private static queueResourceService = new QueueResourceService();

  static async addItemAddByRSSToQueueNext(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
    });

    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { add_by_rss_resource_data } = req.body;
              try {
                const queueResource =
                  await QueueResourceItemAddByRSSController.queueResourceService.addItemAddByRSSToQueueNext(
                    queue_id_text,
                    add_by_rss_resource_data
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

  static async addItemAddByRSSToQueueLast(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
    });

    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { add_by_rss_resource_data } = req.body;
              try {
                const queueResource =
                  await QueueResourceItemAddByRSSController.queueResourceService.addItemAddByRSSToQueueLast(
                    queue_id_text,
                    add_by_rss_resource_data
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

  static async addItemAddByRSSToQueueBetween(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
      ...positionBetweenBodySchema,
    });

    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { add_by_rss_resource_data, position1, position2 } = req.body;
              try {
                const queueResource =
                  await QueueResourceItemAddByRSSController.queueResourceService.addItemAddByRSSToQueueBetween(
                    queue_id_text,
                    add_by_rss_resource_data,
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

  static async addItemAddByRSSToNowPlaying(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      validateBodyObject(queueResourceAddByRSSNowPlayingBodySchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { add_by_rss_resource_data } = req.body;

              try {
                const queueResource =
                  await QueueResourceItemAddByRSSController.queueResourceService.addItemAddByRSSToNowPlaying(
                    queue_id_text,
                    add_by_rss_resource_data
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

  static async addItemAddByRSSToHistory(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(queueIdTextParamSchema), req, res, async () => {
      validateBodyObject(queueResourceAddByRSSNowPlayingBodySchema, req, res, async () => {
        ensureAuthenticated(
          req,
          res,
          async () => {
            verifyQueueOwnership()(req, res, async () => {
              const queue_id_text = getParamRequired(req, 'queue_id_text');
              const { add_by_rss_resource_data } = req.body;

              try {
                const queueResource =
                  await QueueResourceItemAddByRSSController.queueResourceService.addItemAddByRSSToHistory(
                    queue_id_text,
                    add_by_rss_resource_data
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

  static async removeItemAddByRSSFromQueue(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...queueIdTextParamSchema,
      add_by_rss_hash_id: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyQueueOwnership()(req, res, async () => {
            const queue_id_text = getParamRequired(req, 'queue_id_text');
            const add_by_rss_hash_id = getParamRequired(req, 'add_by_rss_hash_id');
            try {
              await QueueResourceItemAddByRSSController.queueResourceService.removeItemAddByRSSFromQueue(
                queue_id_text,
                add_by_rss_hash_id
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

export { QueueResourceItemAddByRSSController };

import type { Request, Response } from 'express';
import Joi from 'joi';
import { FeedService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { validateParamsObject } from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

export class FeedController {
  private static feedService = new FeedService();

  // Always return 200 on not found. This is to prevent unnecessary 404 error handling
  // in the SSR next.js app.
  static async getByPodcastIndexId(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      podcast_index_id: Joi.number().integer().min(1).required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      try {
        const podcast_index_id = getParamRequired(req, 'podcast_index_id');
        const numericId = parseInt(podcast_index_id, 10);
        const data = await FeedController.feedService.getByPodcastIndexId(numericId);

        res.json(data || null);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }
}

import { podcastIndexService } from '@api/factories/podcastIndexService.js';
import { searchFeedDirectory } from '@api/lib/feedDirectories/registry.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  podcastIndexSearchQuerySchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { QueryParamsPodcastIndexSearchMedium } from '@podverse/helpers';

export class PodcastIndexController {
  static async podcastById(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      podcast_index_id: Joi.number().integer().required(),
    }).unknown(false);

    validateParamsObject(paramsSchema, req, res, async () => {
      const podcast_index_id_str = getParamRequired(req, 'podcast_index_id');
      const podcast_index_id = parseInt(podcast_index_id_str, 10);
      const result = await podcastIndexService.podcastGetById(podcast_index_id);

      if (!result) {
        res.status(500).json({ error: 'Failed to fetch podcast from Podcast Index' });
        return;
      }

      res.json(result);
    });
  }

  static async searchPodcasts(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(podcastIndexSearchQuerySchema), req, res, async () => {
      const { q, medium } = req.query as {
        q: string;
        medium: QueryParamsPodcastIndexSearchMedium;
      };
      const results = await searchFeedDirectory('podcast-index', { q, medium });

      if (!results) {
        res.status(500).json({ error: 'Failed to fetch search results from Podcast Index' });
        return;
      }

      res.json(results);
    });
  }
}

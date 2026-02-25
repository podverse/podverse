import type { Request, Response } from 'express';
import Joi from 'joi';
import { StatsTrackEventPlaylistService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';

export class StatsTrackEventPlaylistController {
  private static statsTrackEventPlaylistService = new StatsTrackEventPlaylistService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          playlist_id_text: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const jwtUser = getAuthenticatedUser(req);
          const { playlist_id_text } = req.body;

          try {
            await StatsTrackEventPlaylistController.statsTrackEventPlaylistService._create(
              jwtUser.id,
              playlist_id_text
            );
            res.status(201).json({ message: 'Event logged successfully' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }
}

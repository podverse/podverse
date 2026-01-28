import { Request, Response } from 'express';
import Joi from 'joi';
import { StatsTrackEventClipService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';
import { validateBodyObject } from '@api/lib/validation';

const createStatsTrackEventClipSchema = Joi.object({
  clip_id_text: Joi.string().required(),
});

export class StatsTrackEventClipController {
  private static statsTrackEventClipService = new StatsTrackEventClipService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(createStatsTrackEventClipSchema, req, res, async () => {
          const jwtUser = getAuthenticatedUser(req);
          const { clip_id_text } = req.body;

          try {
            await StatsTrackEventClipController.statsTrackEventClipService._create(
              jwtUser.id,
              clip_id_text
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

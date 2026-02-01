import { Request, Response } from 'express';
import Joi from 'joi';
import { StatsTrackEventChannelService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';
import { validateBodyObject } from '@api/lib/validation';

export class StatsTrackEventChannelController {
  private static statsTrackEventChannelService = new StatsTrackEventChannelService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          channel_id_text: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const jwtUser = getAuthenticatedUser(req);
          const { channel_id_text } = req.body;

          try {
            await StatsTrackEventChannelController.statsTrackEventChannelService._create(
              jwtUser.id,
              channel_id_text
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

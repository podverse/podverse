import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { assertListenStatsAllowed, ListenStatsOptedOutError } from '@api/lib/legal/listenStats.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { ACCOUNT_ENTITLEMENT_CAPABILITY } from '@podverse/helpers';
import { StatsTrackEventPlaylistService } from '@podverse/orm';

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
            await assertListenStatsAllowed(jwtUser.id);
            await StatsTrackEventPlaylistController.statsTrackEventPlaylistService._create(
              jwtUser.id,
              playlist_id_text
            );
            res.status(201).json({ message: 'Event logged successfully' });
          } catch (error) {
            if (error instanceof ListenStatsOptedOutError) {
              res.status(403).json({ message: error.message });
              return;
            }
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false, requiredCapability: ACCOUNT_ENTITLEMENT_CAPABILITY.trackStats }
    );
  }
}

import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { ACCOUNT_ENTITLEMENT_CAPABILITY } from '@podverse/helpers';
import { StatsTrackEventItemService } from '@podverse/orm';

export class StatsTrackEventItemController {
  private static statsTrackEventItemService = new StatsTrackEventItemService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          item_id_text: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const jwtUser = getAuthenticatedUser(req);
          const { item_id_text } = req.body;

          try {
            await StatsTrackEventItemController.statsTrackEventItemService._create(
              jwtUser.id,
              item_id_text
            );
            res.status(201).json({ message: 'Event logged successfully' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false, requiredCapability: ACCOUNT_ENTITLEMENT_CAPABILITY.trackStats }
    );
  }
}

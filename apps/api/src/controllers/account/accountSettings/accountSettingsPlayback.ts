import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { MediaTypePreference } from '@podverse/helpers';
import { AccountSettingsPlaybackService } from '@podverse/orm';

export class AccountSettingsPlaybackController {
  static async update(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      preferred_media_type: Joi.string().valid('audio', 'video').required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { preferred_media_type } = req.body as {
              preferred_media_type: MediaTypePreference;
            };
            const service = new AccountSettingsPlaybackService();
            const updated = await service.update({ account_id, preferred_media_type });
            res.json({ data: { preferred_media_type: updated.preferred_media_type } });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountSettingsNotificationService } from '@podverse/orm';

export class AccountSettingsNotificationController {
  static async update(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      auto_enable_on_subscribe: Joi.boolean().required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { auto_enable_on_subscribe } = req.body as {
              auto_enable_on_subscribe: boolean;
            };
            const service = new AccountSettingsNotificationService();
            const updated = await service.update({ account_id, auto_enable_on_subscribe });
            res.json({
              data: { auto_enable_on_subscribe: updated.auto_enable_on_subscribe },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

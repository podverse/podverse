import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountSettingsListenStatsService } from '@podverse/orm';

export class AccountSettingsListenStatsController {
  static async update(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      allow_listen_stats: Joi.boolean().required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { allow_listen_stats } = req.body as { allow_listen_stats: boolean };
            const service = new AccountSettingsListenStatsService();
            const updated = await service.update({ account_id, allow_listen_stats });
            res.json({ data: { allow_listen_stats: updated.allow_listen_stats } });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

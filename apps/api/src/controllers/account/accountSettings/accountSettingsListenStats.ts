import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountSettingsListenStatsService } from '@podverse/orm';

export class AccountSettingsListenStatsController {
  static async update(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      accepted: Joi.boolean().required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { accepted } = req.body as { accepted: boolean };
            const service = new AccountSettingsListenStatsService();
            const updated = await service.update({
              account_id,
              accepted,
              agreement_version: config.popularityTracking.version,
            });
            res.json({
              data: {
                allow_listen_stats: updated.allow_listen_stats,
                listen_stats_accepted: updated.listen_stats_accepted,
                listen_stats_agreement_version: updated.listen_stats_agreement_version,
                listen_stats_decided_at:
                  updated.listen_stats_decided_at !== null
                    ? updated.listen_stats_decided_at.toISOString()
                    : null,
              },
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

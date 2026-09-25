import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountDeviceAutoDownloadChannelService } from '@podverse/orm';

export class AccountDeviceAutoDownloadController {
  private static service = new AccountDeviceAutoDownloadChannelService();

  /**
   * Replace the full set of auto-download channel registrations for one installation.
   * Empty channel_id_texts clears registration (stops silent pushes for this device).
   */
  static async putChannels(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          installation_id: Joi.string().trim().min(1).max(36).required(),
          channel_id_texts: Joi.array().items(Joi.string().trim().min(1)).required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { installation_id, channel_id_texts } = req.body as {
              installation_id: string;
              channel_id_texts: string[];
            };
            const result = await AccountDeviceAutoDownloadController.service.replaceForInstallation(
              jwtUser.id,
              installation_id,
              channel_id_texts
            );
            res.json(result);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }
}

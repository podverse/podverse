import Joi from 'joi';
import type { Request, Response } from 'express';
import { AccountSettingsLocaleService } from '@podverse/orm';
import { localeBodySchema, validateBodyObject } from '@api/lib/validation/index.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';

export class AccountSettingsLocaleController {
  static async update(req: Request, res: Response): Promise<void> {
    validateBodyObject(Joi.object(localeBodySchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { locale } = req.body;
            const service = new AccountSettingsLocaleService();
            const updated = await service.update({ account_id, locale });
            res.json({ data: updated });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

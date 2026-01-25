import Joi from 'joi';
import { Request, Response } from 'express';
import { AccountSettingsLocaleService } from '@podverse/orm';
import { validateBodyObject } from '@api/lib/validation';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';

const updateAccountSettingsLocaleSchema = Joi.object({
  locale: Joi.string().required(),
});

export class AccountSettingsLocaleController {

  static async update(req: Request, res: Response): Promise<void> {
    validateBodyObject(updateAccountSettingsLocaleSchema, req, res, async () => {
      ensureAuthenticated(req, res, async () => {
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
      }, { skipMembershipStatus: true });
    });
  }
  
}

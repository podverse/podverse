import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  ACCOUNT_NOTIFICATION_TYPE_VALUES,
} from '@podverse/helpers';
import { AccountSettingsNotificationTypeService } from '@podverse/orm';

export class AccountSettingsNotificationTypeController {
  static async create(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      type: Joi.string()
        .valid(...ACCOUNT_NOTIFICATION_TYPE_VALUES)
        .required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { type } = req.body;
            const service = new AccountSettingsNotificationTypeService();
            const created = await service.create({ account_id, type });
            res.json({ data: created });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        {
          skipMembershipStatus: false,
          requiredCapability: ACCOUNT_ENTITLEMENT_CAPABILITY.allowNotifications,
        }
      );
    });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      type: Joi.string()
        .valid(...ACCOUNT_NOTIFICATION_TYPE_VALUES)
        .required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const { type } = req.body;
            const service = new AccountSettingsNotificationTypeService();
            await service.delete(type, account_id);
            res.json({ message: 'Deleted' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

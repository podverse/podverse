import type { Request, Response } from 'express';
import { AccountNotificationChannelTypeService } from '@podverse/orm';
import Joi from 'joi';
import type { AccountNotificationTypeEnum } from '@podverse/helpers';
import { ACCOUNT_NOTIFICATION_TYPE_VALUES } from '@podverse/helpers';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { handleGenericErrorResponse } from '../helpers/error.js';
import {
  channelIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

class AccountNotificationChannelTypeController {
  private static accountNotificationChannelTypeService =
    new AccountNotificationChannelTypeService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          ...channelIdTextParamSchema,
          type: Joi.string()
            .valid(...ACCOUNT_NOTIFICATION_TYPE_VALUES)
            .required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { channel_id_text, type } = req.body as {
              channel_id_text: string;
              type: AccountNotificationTypeEnum;
            };
            const notificationChannelType =
              await AccountNotificationChannelTypeController.accountNotificationChannelTypeService.create(
                jwtUser.id,
                channel_id_text,
                type
              );
            res.status(201).json(notificationChannelType);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async delete(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const paramsSchema = Joi.object({
          ...channelIdTextParamSchema,
          type: Joi.string()
            .valid(...ACCOUNT_NOTIFICATION_TYPE_VALUES)
            .required(),
        });

        validateParamsObject(paramsSchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const channel_id_text = getParamRequired(req, 'channel_id_text');
            const type = getParamRequired(req, 'type') as AccountNotificationTypeEnum;
            await AccountNotificationChannelTypeController.accountNotificationChannelTypeService.delete(
              jwtUser.id,
              channel_id_text,
              type
            );
            res.status(204).end();
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }
}

export { AccountNotificationChannelTypeController };

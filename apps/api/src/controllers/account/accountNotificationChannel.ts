import type { Request, Response } from 'express';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { AccountNotificationChannelService } from '@podverse/orm';
import { handleGenericErrorResponse } from '../helpers/error.js';
import {
  channelIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import Joi from 'joi';
import { getParamRequired } from '@api/lib/params.js';

class AccountNotificationChannelController {
  private static accountNotificationChannelService = new AccountNotificationChannelService();

  static async getByAccountAndChannel(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const channel_id_text = getParamRequired(req, 'channel_id_text');
            const notificationChannel =
              await AccountNotificationChannelController.accountNotificationChannelService.getByAccountIdAndChannelIdText(
                jwtUser.id,
                channel_id_text
              );
            if (!notificationChannel) {
              res.status(404).json({ message: 'Notification channel not found' });
              return;
            }
            res.json(notificationChannel);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async getAllByAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const notificationChannels =
            await AccountNotificationChannelController.accountNotificationChannelService.getAllByAccountId(
              jwtUser.id
            );
          res.json(notificationChannels);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { channel_id_text } = req.body;
            const notificationChannel =
              await AccountNotificationChannelController.accountNotificationChannelService.create(
                jwtUser.id,
                channel_id_text
              );
            res.status(201).json(notificationChannel);
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
        validateParamsObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const channel_id_text = getParamRequired(req, 'channel_id_text');
            await AccountNotificationChannelController.accountNotificationChannelService.delete(
              jwtUser.id,
              channel_id_text
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

export { AccountNotificationChannelController };

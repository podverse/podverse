import type { Request, Response } from 'express';
import Joi from 'joi';
import { AccountFollowingAddByRSSChannelService, AccountService } from '@podverse/orm';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { handleGenericErrorResponse } from '../helpers/error.js';
import {
  accountIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

class AccountFollowingAddByRSSChannelController {
  private static accountService = new AccountService();
  private static accountFollowingAddByRSSChannelService =
    new AccountFollowingAddByRSSChannelService();

  static async getFollowedAddByRSSChannels(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(accountIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          const account_id_text = getParamRequired(req, 'account_id_text');

          try {
            const account =
              await AccountFollowingAddByRSSChannelController.accountService.getByIdText(
                account_id_text
              );
            if (!account) {
              res.status(404).json({ message: 'Account not found.' });
              return;
            }

            if (account.id !== req.user?.id) {
              res.status(403).json({ message: 'Account not found.' });
              return;
            }

            const channels =
              await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.getFollowedAddByRSSChannels(
                account.id
              );
            res.json(channels);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async addOrUpdateRSSChannel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          feed_url: Joi.string().uri().required(),
          title: Joi.string().allow(null, ''),
          image_url: Joi.string().uri().allow(null, ''),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const dto = req.body;

          try {
            await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.addOrUpdateRSSChannel(
              account.id,
              dto
            );
            res.status(201).json({ message: 'RSS channel added/updated successfully' });
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async removeRSSChannel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          feed_url: Joi.string().uri().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { feed_url } = req.body;

          try {
            await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.removeRSSChannel(
              account.id,
              feed_url
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

export { AccountFollowingAddByRSSChannelController };

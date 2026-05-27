import {
  ensureAuthenticated,
  getAuthenticatedUser,
  optionalEnsureAuthenticated,
} from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  accountIdTextParamSchema,
  channelIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { QueryParamsMedium } from '@podverse/helpers';
import { QUERY_PARAMS_MEDIUMS, SharableStatusEnum } from '@podverse/helpers';
import { AccountFollowingChannelService, AccountService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

class AccountFollowingChannelController {
  private static accountFollowingChannelService = new AccountFollowingChannelService();
  private static accountService = new AccountService();

  static async getFollowedChannels(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      medium: Joi.string()
        .valid(...QUERY_PARAMS_MEDIUMS)
        .required(),
    });

    validateParamsObject(Joi.object(accountIdTextParamSchema), req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        optionalEnsureAuthenticated(
          req,
          res,
          async (): Promise<void> => {
            try {
              const jwtUser = req.user;
              const account_id_text = getParamRequired(req, 'account_id_text');
              const { medium } = req.query as {
                medium: QueryParamsMedium;
              };
              const account = await AccountFollowingChannelController.accountService.getByIdText(
                account_id_text,
                { relations: { sharable_status: true } }
              );
              if (!account) {
                res.status(404).json({ message: 'Account not found' });
                return;
              }

              if (account.sharable_status.id === SharableStatusEnum.Private) {
                if (!jwtUser?.id || account.id !== jwtUser.id) {
                  res.status(404).json({ message: 'Account not found' });
                  return;
                }
              }

              const followedChannels =
                await AccountFollowingChannelController.accountFollowingChannelService.getFollowedChannels(
                  account.id,
                  medium,
                  { relations: { channel: true } }
                );
              res.json(followedChannels);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          },
          { skipMembershipStatus: true }
        );
      });
    });
  }

  static async followChannel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { channel_id_text } = req.body;

          try {
            await AccountFollowingChannelController.accountFollowingChannelService.followChannel(
              account.id,
              channel_id_text
            );
            res.status(201).json({ message: 'Successfully followed channel' });
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async unfollowChannel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { channel_id_text } = req.body;

          try {
            await AccountFollowingChannelController.accountFollowingChannelService.unfollowChannel(
              account.id,
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

export { AccountFollowingChannelController };

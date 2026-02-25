import type { Request, Response } from 'express';
import Joi from 'joi';
import { AccountFollowingAccountService, AccountService } from '@podverse/orm';
import {
  ensureAuthenticated,
  optionalEnsureAuthenticated,
  getAuthenticatedUser,
} from '@api/lib/auth/index.js';
import { handleGenericErrorResponse } from '../helpers/error.js';
import {
  accountIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { SharableStatusEnum } from '@podverse/helpers';
import { getParamRequired } from '@api/lib/params.js';

class AccountFollowingAccountController {
  private static accountFollowingAccountService = new AccountFollowingAccountService();
  private static accountService = new AccountService();

  static async getFollowedAccounts(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(accountIdTextParamSchema), req, res, async () => {
      optionalEnsureAuthenticated(
        req,
        res,
        async (): Promise<void> => {
          try {
            const jwtUser = req.user;
            const account_id_text = getParamRequired(req, 'account_id_text');

            const account = await AccountFollowingAccountController.accountService.getByIdText(
              account_id_text,
              { relations: ['sharable_status'] }
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

            if (account.id === jwtUser?.id) {
              const followedPlaylists =
                await AccountFollowingAccountController.accountFollowingAccountService.getFollowedAccountsPrivate(
                  account.id
                );
              res.json(followedPlaylists);
            } else {
              const followedPlaylists =
                await AccountFollowingAccountController.accountFollowingAccountService.getFollowedAccountsPublic(
                  account.id
                );
              res.json(followedPlaylists);
            }
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async followAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          following_account_id_text: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { following_account_id_text } = req.body;

          try {
            await AccountFollowingAccountController.accountFollowingAccountService.followAccount(
              account.id,
              { following_account_id_text }
            );
            res.status(201).json({ message: 'Successfully followed account' });
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async unfollowAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          following_account_id_text: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { following_account_id_text } = req.body;

          try {
            await AccountFollowingAccountController.accountFollowingAccountService.unfollowAccount(
              account.id,
              { following_account_id_text }
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

export { AccountFollowingAccountController };

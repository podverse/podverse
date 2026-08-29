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

import type { BulkFollowChannelsResponse, QueryParamsMedium } from '@podverse/helpers';
import {
  MAX_BULK_FOLLOW_CHANNELS,
  QUERY_PARAMS_MEDIUMS,
  SharableStatusEnum,
  summarizeBulkFollowResults,
} from '@podverse/helpers';
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

  /**
   * Follow many channels at once, reporting an outcome per channel.
   *
   * Exists for mobile's sign-up merge: a signed-out user subscribes locally, and those follows are
   * pushed up in one request when they create an account. One single-follow call per channel would
   * hit rate limits and leave a partial merge behind on the first failure.
   *
   * Membership is required, matching single follow — this creates server-side follows.
   */
  static async followChannelsBulk(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          channel_id_texts: Joi.array()
            .items(Joi.string().required())
            .min(1)
            .max(MAX_BULK_FOLLOW_CHANNELS)
            .required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { channel_id_texts } = req.body;

          try {
            const results =
              await AccountFollowingChannelController.accountFollowingChannelService.followChannelsBulk(
                account.id,
                channel_id_texts
              );
            const response: BulkFollowChannelsResponse = {
              totals: summarizeBulkFollowResults(results),
              results,
            };
            // 200, not 201: a repeat submission creates nothing, and the caller reads the outcomes
            // to find out what actually changed.
            res.status(200).json(response);
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

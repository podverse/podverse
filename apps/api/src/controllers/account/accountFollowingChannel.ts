import { loggerService } from '@api/factories/loggerService.js';
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
import {
  AccountFollowingChannelService,
  AccountNotificationChannelService,
  AccountService,
  AccountSettingsNotificationService,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

class AccountFollowingChannelController {
  private static accountFollowingChannelService = new AccountFollowingChannelService();
  private static accountNotificationChannelService = new AccountNotificationChannelService();
  private static accountService = new AccountService();
  private static accountSettingsNotificationService = new AccountSettingsNotificationService();

  /**
   * Whether this account asked for notifications to follow along with its subscriptions.
   *
   * Read as off when the settings row cannot be loaded: a follow must never turn notifications on
   * by accident.
   */
  private static async isAutoEnableOnSubscribeEnabled(account_id: number): Promise<boolean> {
    try {
      const settings =
        await AccountFollowingChannelController.accountSettingsNotificationService.getByAccountId(
          account_id
        );
      return settings?.auto_enable_on_subscribe === true;
    } catch (err) {
      loggerService.error('Could not read auto_enable_on_subscribe for follow', {
        account_id,
        error: err,
      });
      return false;
    }
  }

  /**
   * Create the per-channel notification row for a channel the account just followed.
   *
   * The follow has already succeeded and been recorded by the time this runs, so a failure here is
   * logged and swallowed — losing notifications is recoverable from Settings, losing the follow is
   * not.
   */
  private static async createNotificationChannelForFollow(
    account_id: number,
    channel_id_text: string
  ): Promise<void> {
    try {
      const existing =
        await AccountFollowingChannelController.accountNotificationChannelService.getByAccountIdAndChannelIdText(
          account_id,
          channel_id_text
        );
      if (existing !== null) {
        return;
      }

      await AccountFollowingChannelController.accountNotificationChannelService.create(
        account_id,
        channel_id_text
      );
    } catch (err) {
      loggerService.error('Could not auto-enable notifications for a followed channel', {
        account_id,
        channel_id_text,
        error: err,
      });
    }
  }

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

            if (
              await AccountFollowingChannelController.isAutoEnableOnSubscribeEnabled(account.id)
            ) {
              await AccountFollowingChannelController.createNotificationChannelForFollow(
                account.id,
                channel_id_text
              );
            }

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

            if (
              await AccountFollowingChannelController.isAutoEnableOnSubscribeEnabled(account.id)
            ) {
              // Only the channels this request actually followed: an already-followed channel was
              // handled when it was first followed, and its notification row is the user's to keep
              // or remove.
              for (const result of results) {
                if (result.outcome === 'followed') {
                  await AccountFollowingChannelController.createNotificationChannelForFollow(
                    account.id,
                    result.channel_id_text
                  );
                }
              }
            }

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

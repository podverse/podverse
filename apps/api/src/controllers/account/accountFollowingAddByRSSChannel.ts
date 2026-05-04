import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  accountIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountFollowingAddByRSSChannelService, AccountService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

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
          basic_auth_username: Joi.string().allow(null, '').max(255),
          basic_auth_password: Joi.string().allow(null, '').max(255),
        })
          .messages({
            'any.invalid': 'Basic Auth requires both username and password when one is provided',
          })
          .custom((value, helpers) => {
            const hasUsername =
              value.basic_auth_username !== undefined &&
              value.basic_auth_username !== null &&
              String(value.basic_auth_username).trim() !== '';
            const hasPassword =
              value.basic_auth_password !== undefined &&
              value.basic_auth_password !== null &&
              String(value.basic_auth_password) !== '';
            if (hasUsername !== hasPassword) {
              return helpers.error('any.invalid');
            }
            return value;
          });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const entitlements = account.entitlements;
          const body = req.body as {
            feed_url: string;
            title?: string | null;
            image_url?: string | null;
            basic_auth_username?: string | null;
            basic_auth_password?: string | null;
          };
          const dto = {
            ...body,
            basic_auth_username:
              body.basic_auth_username !== undefined &&
              body.basic_auth_username !== null &&
              String(body.basic_auth_username).trim() !== ''
                ? String(body.basic_auth_username).trim()
                : null,
            basic_auth_password:
              body.basic_auth_password !== undefined &&
              body.basic_auth_password !== null &&
              String(body.basic_auth_password) !== ''
                ? body.basic_auth_password
                : null,
          };

          try {
            if (entitlements) {
              const alreadySaved =
                await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.hasFollowedAddByRSSChannel(
                  account.id,
                  dto.feed_url
                );
              const existingCount =
                await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.getFollowedAddByRSSChannelCount(
                  account.id
                );
              if (!alreadySaved && existingCount >= entitlements.maxAddByRSSFeeds) {
                const trustedLimitRaw = process.env.TRUST_TRUSTED_MAX_ADD_BY_RSS_FEEDS;
                const trustedLimitParsed = trustedLimitRaw
                  ? Number.parseInt(trustedLimitRaw, 10)
                  : 100;
                const trustedLimit = Number.isFinite(trustedLimitParsed) ? trustedLimitParsed : 100;
                res.status(403).json({
                  message: `Your account can only save up to ${entitlements.maxAddByRSSFeeds} Add by RSS feeds. Renew your membership to raise this limit to ${trustedLimit}.`,
                  code: 'add_by_rss_feed_limit_reached',
                  i18nKey: 'membership.add_by_rss_feed_limit_reached',
                  renewPath: '/membership/renew',
                });
                return;
              }
            }

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

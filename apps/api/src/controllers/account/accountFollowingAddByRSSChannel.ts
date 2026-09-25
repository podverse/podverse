import { config } from '@api/config/index.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  accountIdTextParamSchema,
  joiFeedUrl,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { APP_ROUTES } from '@podverse/helpers';
import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation';
import { AccountFollowingAddByRSSChannelService, AccountService } from '@podverse/orm';
import type { AccountFollowingAddByRSSChannelDto } from '@podverse/orm';

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
        // Credentials are never stored server-side. Any `basic_auth_*` keys a client still sends
        // are unknown to this schema and dropped by stripUnknown before the handler runs.
        const bodySchema = Joi.object({
          feed_url: joiFeedUrl(),
          title: Joi.string().allow(null, ''),
          image_url: Joi.string().uri().allow(null, ''),
          requires_credentials: Joi.boolean().optional(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const entitlements = account.entitlements;
          const body = req.body as {
            feed_url: string;
            title?: string | null;
            image_url?: string | null;
            requires_credentials?: boolean;
          };
          const resolved = resolveAddByRSSFeedUrlCredentials(body.feed_url);
          if (!resolved) {
            res.status(400).json({ message: '"feed_url" must be a valid uri' });
            return;
          }
          const requiresCredentials =
            resolved.credentials !== null ? true : body.requires_credentials;
          const dto: AccountFollowingAddByRSSChannelDto = {
            feed_url: resolved.feedUrl,
            title: body.title,
            image_url: body.image_url,
            ...(requiresCredentials !== undefined
              ? { requires_credentials: requiresCredentials }
              : {}),
          };

          try {
            // Mobile E2E stack seeds a trial user whose Add-by-RSS cap can resolve to 0;
            // skip the entitlement limit gate under deterministic fixtures.
            if (entitlements && !config.e2e.fixturesEnabled) {
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
                const premiumLimitRaw = process.env.MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS;
                const premiumLimitParsed = premiumLimitRaw
                  ? Number.parseInt(premiumLimitRaw, 10)
                  : 100;
                const premiumLimit = Number.isFinite(premiumLimitParsed) ? premiumLimitParsed : 100;
                res.status(403).json({
                  message: `Your account can only save up to ${entitlements.maxAddByRSSFeeds} Add by RSS feeds. Renew your membership to raise this limit to ${premiumLimit}.`,
                  code: 'add_by_rss_feed_limit_reached',
                  i18nKey: 'membership.add_by_rss_feed_limit_reached',
                  renewPath: APP_ROUTES.MEMBERSHIP_RENEW,
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
          feed_url: joiFeedUrl(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { feed_url } = req.body;
          const feedUrl = resolveAddByRSSFeedUrlCredentials(feed_url)?.feedUrl ?? feed_url;

          try {
            await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.removeRSSChannel(
              account.id,
              feedUrl
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

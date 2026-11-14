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

import type { DTOChannelDirectoryMatch } from '@podverse/helpers';
import { addByRssFeedLimitReachedMessage, splitFeedUrlUserinfo } from '@podverse/helpers';
import {
  canonicalAddByRSSFeedUrl,
  resolveAddByRSSFeedUrlCredentials,
} from '@podverse/helpers-validation';
import type { AccountFollowingAddByRSSChannelDto } from '@podverse/orm';
import {
  AccountAddByRSSDirectoryConversionService,
  AccountFollowingAddByRSSChannelService,
  AccountFollowingChannelService,
  AccountService,
  AddByRssFeedLimitReachedError,
  ChannelAddByRSSDirectoryMatchService,
  findBlockedFeed,
  FollowLimitReachedError,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

class AccountFollowingAddByRSSChannelController {
  private static accountService = new AccountService();
  private static accountFollowingAddByRSSChannelService =
    new AccountFollowingAddByRSSChannelService();
  private static followingChannelService = new AccountFollowingChannelService();
  private static matchService = new ChannelAddByRSSDirectoryMatchService();
  private static conversionService = new AccountAddByRSSDirectoryConversionService();

  /**
   * The directory channel this URL already belongs to, after this account follows it.
   * Null when the feed stays Add by RSS.
   */
  private static async directoryChannelForAdd(params: {
    accountId: number;
    feedUrl: string;
    requestFeedUrl: string;
    requiresCredentials: boolean;
  }): Promise<DTOChannelDirectoryMatch | null> {
    if (params.requiresCredentials) {
      return null;
    }
    const userinfo = splitFeedUrlUserinfo(params.requestFeedUrl);
    if (userinfo.username !== null || userinfo.password !== null) {
      return null;
    }
    const canonical = canonicalAddByRSSFeedUrl(params.feedUrl);
    if (canonical === null) {
      return null;
    }

    const matches = await AccountFollowingAddByRSSChannelController.matchService.getForFeedUrls([
      { feedUrl: canonical, feedGuid: null },
    ]);
    const found = matches.get(canonical);
    if (found === undefined) {
      return null;
    }

    const alreadySaved =
      await AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService.hasFollowedAddByRSSChannel(
        params.accountId,
        canonical
      );
    if (alreadySaved) {
      const converted = await AccountFollowingAddByRSSChannelController.conversionService.convert({
        accountId: params.accountId,
        feedUrl: canonical,
        feedGuid: null,
      });
      if (converted.converted) {
        return converted.channel;
      }
      if (converted.reason === 'not_followed') {
        const followed = await AccountFollowingAddByRSSChannelController.followDirectoryChannel(
          params.accountId,
          found.match.id_text
        );
        return followed ? found.match : null;
      }
      return null;
    }

    const followed = await AccountFollowingAddByRSSChannelController.followDirectoryChannel(
      params.accountId,
      found.match.id_text
    );
    return followed ? found.match : null;
  }

  /** False when the follow tier is full, so the caller keeps the Add by RSS follow. */
  private static async followDirectoryChannel(
    accountId: number,
    channelIdText: string
  ): Promise<boolean> {
    try {
      await AccountFollowingAddByRSSChannelController.followingChannelService.followChannel(
        accountId,
        channelIdText
      );
      return true;
    } catch (error) {
      if (error instanceof FollowLimitReachedError) {
        return false;
      }
      throw error;
    }
  }

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
        {
          skipMembershipStatus: true,
          apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
        }
      );
    });
  }

  static async addOrUpdateRSSChannel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        // Credentials are never stored on this route. `basic_auth_*` is not a field on this body;
        // stripUnknown drops those keys before the handler runs.
        const bodySchema = Joi.object({
          feed_url: joiFeedUrl(),
          title: Joi.string().allow(null, ''),
          image_url: Joi.string().uri().allow(null, ''),
          requires_credentials: Joi.boolean().optional(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
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
            const blockedFeed = await findBlockedFeed({ url: dto.feed_url });
            if (blockedFeed !== null) {
              res.status(403).json({
                message: 'This feed is blocked.',
                code: 'feed_blocked',
              });
              return;
            }

            const directoryChannel =
              await AccountFollowingAddByRSSChannelController.directoryChannelForAdd({
                accountId: account.id,
                feedUrl: dto.feed_url,
                requestFeedUrl: body.feed_url,
                requiresCredentials: requiresCredentials === true,
              });
            if (directoryChannel !== null) {
              res.status(200).json({
                message: 'Followed directory channel',
                directory_channel: directoryChannel,
              });
              return;
            }

            // Fixture stacks can resolve a trial cap of 0. Those adds skip the tier.
            const rssChannelService =
              AccountFollowingAddByRSSChannelController.accountFollowingAddByRSSChannelService;
            if (config.e2e.fixturesEnabled) {
              await rssChannelService.addOrUpdateRSSChannel(account.id, dto, {
                enforceLimit: false,
              });
            } else {
              await rssChannelService.addOrUpdateRSSChannel(account.id, dto);
            }
            res.status(201).json({
              message: 'RSS channel added/updated successfully',
              directory_channel: null,
            });
          } catch (err) {
            if (err instanceof AddByRssFeedLimitReachedError) {
              res.status(403).json({
                message: addByRssFeedLimitReachedMessage(err.limit, config.terms.contactEmail),
                code: err.code,
                i18nKey: err.i18nKey,
                limit: err.limit,
              });
              return;
            }
            handleGenericErrorResponse(res, err);
          }
        });
      },
      {
        skipMembershipStatus: false,
        apiKeyAccess: { resource: 'add_by_rss', action: 'create' },
      }
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
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'add_by_rss', action: 'delete' },
      }
    );
  }

  static async getAddByRSSFeedLimit(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const entitlements = getAuthenticatedUser(req).entitlements;
        if (entitlements === undefined) {
          handleGenericErrorResponse(res, new Error('Entitlements were not resolved'));
          return;
        }
        res.status(200).json({ data: { maxAddByRSSFeeds: entitlements.maxAddByRSSFeeds } });
      },
      {
        skipMembershipStatus: false,
        apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
      }
    );
  }
}

export { AccountFollowingAddByRSSChannelController };

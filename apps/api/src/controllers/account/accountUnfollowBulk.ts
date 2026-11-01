import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { dropUnusedSubscribeSeedsForChannels } from '@api/lib/tasteSubscribeSeed.js';
import { joiFeedUrl, validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { MAX_BULK_UNFOLLOW_FEEDS } from '@podverse/helpers';
import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation';
import {
  AccountFollowingAddByRSSChannelService,
  AccountFollowingChannelService,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

/**
 * Ends many follows in one request so unsubscribing an artist with its albums cannot stop partway.
 */
class AccountUnfollowBulkController {
  private static accountFollowingChannelService = new AccountFollowingChannelService();
  private static accountFollowingAddByRSSChannelService =
    new AccountFollowingAddByRSSChannelService();

  static async unfollowBulk(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          channel_id_texts: Joi.array()
            .items(Joi.string().required())
            .max(MAX_BULK_UNFOLLOW_FEEDS)
            .default([]),
          add_by_rss_feed_urls: Joi.array()
            .items(joiFeedUrl())
            .max(MAX_BULK_UNFOLLOW_FEEDS)
            .default([]),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          const account = getAuthenticatedUser(req);
          const { channel_id_texts, add_by_rss_feed_urls } = req.body;

          if (channel_id_texts.length === 0 && add_by_rss_feed_urls.length === 0) {
            res.status(400).json({
              message: 'Provide channel_id_texts or add_by_rss_feed_urls.',
            });
            return;
          }

          if (channel_id_texts.length + add_by_rss_feed_urls.length > MAX_BULK_UNFOLLOW_FEEDS) {
            res.status(400).json({
              message: `At most ${MAX_BULK_UNFOLLOW_FEEDS} feeds per request.`,
            });
            return;
          }

          const feedUrls = add_by_rss_feed_urls.map(
            (url: string) => resolveAddByRSSFeedUrlCredentials(url)?.feedUrl ?? url
          );

          try {
            if (channel_id_texts.length > 0) {
              await AccountUnfollowBulkController.accountFollowingChannelService.unfollowChannelsBulk(
                account.id,
                channel_id_texts
              );
              await dropUnusedSubscribeSeedsForChannels(account.id, channel_id_texts);
            }
            if (feedUrls.length > 0) {
              await AccountUnfollowBulkController.accountFollowingAddByRSSChannelService.removeRSSChannelsBulk(
                account.id,
                feedUrls
              );
            }
            res.status(204).end();
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'subscriptions', action: 'delete' },
      }
    );
  }
}

export { AccountUnfollowBulkController };

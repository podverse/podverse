import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { generateOpml } from '@api/lib/opml/generateOpml.js';
import type { Request, Response } from 'express';

import {
  AccountFollowingAddByRSSChannelService,
  AccountFollowingChannelService,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

class AccountOpmlExportController {
  private static accountFollowingChannelService = new AccountFollowingChannelService();
  private static accountFollowingAddByRSSChannelService =
    new AccountFollowingAddByRSSChannelService();

  static async exportOpml(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const account = getAuthenticatedUser(req);
          const followedChannels =
            await AccountOpmlExportController.accountFollowingChannelService.getFollowedChannels(
              account.id,
              null,
              {
                relations: {
                  channel: {
                    feed: true,
                  },
                },
              }
            );
          const followedAddByRssChannels =
            await AccountOpmlExportController.accountFollowingAddByRSSChannelService.getFollowedAddByRSSChannels(
              account.id
            );

          const directoryChannels = followedChannels
            .map((followedChannel) => {
              const feedUrl = followedChannel.channel?.feed?.url;
              if (!feedUrl) {
                return null;
              }

              return {
                title: followedChannel.channel?.title ?? null,
                feedUrl,
              };
            })
            .filter((row): row is { title: string | null; feedUrl: string } => row !== null);
          const addByRssChannels = followedAddByRssChannels.map((followedAddByRssChannel) => ({
            title: followedAddByRssChannel.title ?? null,
            feedUrl: followedAddByRssChannel.feed_url,
          }));

          const opml = generateOpml({
            directoryChannels,
            addByRssChannels,
          });
          const filename = `podverse-opml-export-${new Date().toISOString().split('T')[0]}.opml`;

          res.setHeader('Content-Type', 'text/x-opml; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.status(200).send(opml);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }
}

export { AccountOpmlExportController };

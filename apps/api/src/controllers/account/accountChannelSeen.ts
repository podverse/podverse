import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject, validateQueryObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { AddByRssSeenState, ChannelSeenMarkEntry, ChannelSeenState } from '@podverse/helpers';
import {
  CHANNEL_SEEN_MARK_BATCH_LIMIT,
  CHANNEL_SEEN_READ_PAGE_LIMIT,
  capUnseenCount,
} from '@podverse/helpers';
import type { ChannelSeenRow } from '@podverse/orm';
import { AccountFollowingAddByRSSChannelService, AccountFollowingChannelService } from '@podverse/orm';

/**
 * Per-channel seen state for the signed-in account.
 *
 * Mobile and web are both first-class callers: mobile syncs the state in the background so a badge
 * is available offline, web reads it to badge the list it is rendering. Neither one fans out a
 * request per channel — a subscription list can be hundreds long, and that is the shape this
 * endpoint exists to avoid.
 *
 * A read page is large enough that a whole subscription list is normally one request, because the
 * two lists cannot be paged against each other: this one is ordered by channel id, while the list a
 * client renders is ordered by whatever the user chose. Page N of one is not page N of the other,
 * so a caller needs the state for channels it has not reached yet.
 *
 * The reads are rate limited per account. The cost of one is bounded by how much the account
 * follows, and nothing bounds that but the page limit, so the limiter is what stops a signed-in
 * client in a loop from turning a cheap query into a busy one.
 *
 * Membership is not required. Seen state is account tier: anyone signed in gets it, and a signed-out
 * device derives the same counts locally.
 */
/**
 * Per-account ceiling on the two reads.
 *
 * Exported so integration tests can reset the counter, since the default store is in-memory for the
 * process lifetime and a test that exercises the limit would otherwise 429 every later case.
 */
export const channelSeenReadRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountChannelSeenRead.windowMs,
  max: config.rateLimits.accountChannelSeenRead.max,
});

export class AccountChannelSeenController {
  private static accountFollowingChannelService = new AccountFollowingChannelService();
  private static accountFollowingAddByRSSChannelService =
    new AccountFollowingAddByRSSChannelService();

  static async getChannelSeen(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
    });

    validateQueryObject(querySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const page = Number(req.query.page ?? 1);
            const limit = CHANNEL_SEEN_READ_PAGE_LIMIT;
            const offset = (page - 1) * limit;

            const { count, results } =
              await AccountChannelSeenController.accountFollowingChannelService.listSeenStateWithCount(
                jwtUser.id,
                { limit, offset }
              );

            res.json({
              data: results.map(toChannelSeenState),
              meta: { page, count, limit },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  /**
   * Seen state for followed add-by-RSS feeds, without counts.
   *
   * Separate from the channel list rather than a second array inside it, because the two are
   * different lengths and paginating them together would make one page cursor mean two things.
   */
  static async getAddByRssSeen(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
    });

    validateQueryObject(querySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const page = Number(req.query.page ?? 1);
            const limit = CHANNEL_SEEN_READ_PAGE_LIMIT;
            const offset = (page - 1) * limit;

            const { count, results } =
              await AccountChannelSeenController.accountFollowingAddByRSSChannelService.listSeenState(
                jwtUser.id,
                { limit, offset }
              );

            res.json({
              data: results.map(toAddByRssSeenState),
              meta: { page, count, limit },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async markSeen(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      entries: Joi.array()
        .items(
          Joi.object({
            channel_id_text: Joi.string().required(),
            last_seen_at: Joi.string().isoDate(),
          })
        )
        .min(1)
        .max(CHANNEL_SEEN_MARK_BATCH_LIMIT)
        .required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { entries } = req.body as { entries: ChannelSeenMarkEntry[] };

            const marked =
              await AccountChannelSeenController.accountFollowingChannelService.markChannelsSeen(
                jwtUser.id,
                entries.map((entry) => ({
                  channel_id_text: entry.channel_id_text,
                  last_seen_at:
                    entry.last_seen_at === undefined ? undefined : new Date(entry.last_seen_at),
                })),
                new Date()
              );

            res.json({ data: marked.map(toChannelSeenState) });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  /**
   * Mark every followed channel and add-by-RSS feed seen.
   *
   * Server-side sweep rather than a client-sent list, so the cost does not scale with how much the
   * account follows and a device with a partial local list cannot leave some channels behind.
   */
  static async markAllSeen(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const seenAt = new Date();

          const channelCount =
            await AccountChannelSeenController.accountFollowingChannelService.markAllChannelsSeen(
              jwtUser.id,
              seenAt
            );
          const addByRssCount =
            await AccountChannelSeenController.accountFollowingAddByRSSChannelService.markAllAddByRSSChannelsSeen(
              jwtUser.id,
              seenAt
            );

          res.json({
            data: {
              last_seen_at: seenAt.toISOString(),
              updated_count: channelCount + addByRssCount,
            },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async markAddByRssSeen(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      entries: Joi.array()
        .items(
          Joi.object({
            feed_url: Joi.string().required(),
            last_seen_at: Joi.string().isoDate(),
          })
        )
        .min(1)
        .max(CHANNEL_SEEN_MARK_BATCH_LIMIT)
        .required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { entries } = req.body as {
              entries: { feed_url: string; last_seen_at?: string }[];
            };

            const marked =
              await AccountChannelSeenController.accountFollowingAddByRSSChannelService.markAddByRSSChannelsSeen(
                jwtUser.id,
                entries.map((entry) => ({
                  feed_url: entry.feed_url,
                  last_seen_at:
                    entry.last_seen_at === undefined ? undefined : new Date(entry.last_seen_at),
                })),
                new Date()
              );

            res.json({ data: marked.map(toAddByRssSeenState) });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

const toChannelSeenState = (row: ChannelSeenRow): ChannelSeenState => {
  const { has_more_unseen, unseen_count } = capUnseenCount(row.raw_unseen_count);
  return {
    channel_id_text: row.channel_id_text,
    has_more_unseen,
    last_seen_at: row.last_seen_at?.toISOString() ?? null,
    unseen_count,
  };
};

const toAddByRssSeenState = (row: {
  feed_url: string;
  last_seen_at: Date | null;
}): AddByRssSeenState => {
  return {
    feed_url: row.feed_url,
    last_seen_at: row.last_seen_at?.toISOString() ?? null,
  };
};

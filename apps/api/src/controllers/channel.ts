import { config } from '@api/config/index.js';
import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { sendMergedInto } from '@api/controllers/helpers/mergedInto.js';
import { getPaginationParams } from '@api/controllers/helpers/pagination.js';
import { loggerService } from '@api/factories/loggerService.js';
import {
  ensureAuthenticated,
  getActiveSessionAccountId,
  getAuthenticatedUser,
} from '@api/lib/auth/index.js';
import { getFollowedChannelIds } from '@api/lib/followed.js';
import { getParamRequired } from '@api/lib/params.js';
import { rateLimitOptionalAuthEndpoint } from '@api/lib/rateLimiter.js';
import { getStatsOrder } from '@api/lib/stats.js';
import {
  channelTitleSearchQuerySchema,
  idOrIdTextParamSchema,
  mediumCategoryPageQuerySchema,
  mediumCategoryPageRangeQuerySchema,
  mediumPageQuerySchema,
  mediumPageRangeQuerySchema,
  validateBodyObject,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import { attachVerifiedPublishers } from '@api/lib/verifiedPublishers.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type {
  CategoryMappingKeys,
  DTOAddByRSSMatchFeed,
  DTOAddByRSSMatchFeedRef,
  DTOAddByRSSMatchItemRef,
  DTOAddByRSSMatchResponse,
  DTOChannelDirectoryMatch,
  QueryParamsMedium,
  QueryParamsPodcastIndexSearchMedium,
  StatsPopularityCountField,
} from '@podverse/helpers';
import {
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS,
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS,
  fillTopPage,
  getCategoryEnumValue,
  pageLookaheadTake,
  resolvePageLookahead,
  TOP_STATS_PAD_MAX_RANKED,
} from '@podverse/helpers';
import type { ApiListResponse, QueryParamsStatsRange } from '@podverse/helpers-requests';
import type {
  AccountFollowingChannel,
  Channel,
  FindManyOptions,
  StatsPopularityChannel,
} from '@podverse/orm';
import {
  AccountFollowingChannelService,
  CatalogPodcastIndexAllowlistService,
  ChannelAddByRSSDirectoryMatchService,
  channelGetManyRelations,
  channelGetOneRelations,
  ChannelMergeRedirectService,
  ChannelService,
  StatsPopularityChannelService,
  subChannelGetManyRelations,
  TasteProfileAccountService,
} from '@podverse/orm';

const addByRSSMatchItemSchema = Joi.object({
  guid: Joi.string().max(2048).allow(null).default(null),
  enclosure_url: Joi.string().max(4096).allow(null).default(null),
});

const addByRSSMatchBodySchema = Joi.object({
  feeds: Joi.array()
    .items(
      Joi.object({
        feed_url: Joi.string().max(2048).required(),
        feed_guid: Joi.string().max(255).allow(null).default(null),
        items: Joi.array().items(addByRSSMatchItemSchema).default([]),
      })
    )
    .min(1)
    .max(ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS)
    .required(),
});

/**
 * Signed-out callers share an IP budget. Signed-in callers share an account budget. A key is
 * refused: the route reads public catalog data and writes nothing.
 */
export const channelAddByRssMatchRateLimit = rateLimitOptionalAuthEndpoint({
  account: {
    windowMs: config.rateLimits.channelAddByRssMatch.windowMs,
    max: config.rateLimits.channelAddByRssMatch.max,
  },
  address: {
    windowMs: config.rateLimits.channelAddByRssMatchAnon.windowMs,
    max: config.rateLimits.channelAddByRssMatchAnon.max,
  },
});

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function readAddByRSSMatchFeeds(body: unknown): DTOAddByRSSMatchFeedRef[] | null {
  if (typeof body !== 'object' || body === null || !('feeds' in body)) {
    return null;
  }
  const { feeds } = body;
  if (!Array.isArray(feeds)) {
    return null;
  }
  const parsed: DTOAddByRSSMatchFeedRef[] = [];
  for (const feed of feeds) {
    if (typeof feed !== 'object' || feed === null || !('feed_url' in feed)) {
      return null;
    }
    if (typeof feed.feed_url !== 'string') {
      return null;
    }
    const feedGuid = 'feed_guid' in feed ? feed.feed_guid : null;
    if (!isNullableString(feedGuid)) {
      return null;
    }
    const itemsRaw = 'items' in feed ? feed.items : [];
    if (!Array.isArray(itemsRaw)) {
      return null;
    }
    const items: DTOAddByRSSMatchItemRef[] = [];
    for (const item of itemsRaw) {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const guid = 'guid' in item ? item.guid : null;
      const enclosureUrl = 'enclosure_url' in item ? item.enclosure_url : null;
      if (!isNullableString(guid) || !isNullableString(enclosureUrl)) {
        return null;
      }
      items.push({ guid, enclosure_url: enclosureUrl });
    }
    parsed.push({ feed_url: feed.feed_url, feed_guid: feedGuid, items });
  }
  return parsed;
}

const directoryMatchQuerySchema = {
  feed_guid: Joi.string().trim().min(1).max(255).required(),
  feed_url: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .optional(),
};

export class ChannelController {
  private static channelService = new ChannelService();
  private static directoryMatchService = new ChannelAddByRSSDirectoryMatchService();
  private static mergeRedirects = new ChannelMergeRedirectService();
  private static allowlist = new CatalogPodcastIndexAllowlistService();
  private static statsPopularityChannelService = new StatsPopularityChannelService();
  private static tasteProfileAccountService = new TasteProfileAccountService();

  private static isParsedReadyChannel(channel: Channel | null): channel is Channel {
    return Boolean(channel?.channel_about);
  }

  /**
   * Channel ids the active session hid from Browse and Recommendations. Undefined when anonymous
   * or when the account has none, so callers can omit the exclude filter.
   */
  private static async browseExcludeIds(req: Request): Promise<number[] | undefined> {
    const accountId = await getActiveSessionAccountId(req);
    if (accountId === null) {
      return undefined;
    }
    const ids =
      await ChannelController.tasteProfileAccountService.listHiddenChannelIdsForAccount(accountId);
    return ids.length > 0 ? ids : undefined;
  }

  /**
   * One page of channels whose count for the range is above zero. Directory Top returns this page
   * as is, so a range with no count above zero is an empty list and a short page stays short.
   */
  private static async loadRankedTopChannels(args: {
    category_id: number | null;
    channelIds?: number[];
    excludeIds?: number[];
    limit: number;
    medium: QueryParamsMedium;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Channel[]> {
    const { category_id, channelIds, excludeIds, limit, medium, offset, orderField } = args;
    const topConfig: FindManyOptions<StatsPopularityChannel> = {
      order: { [orderField]: 'DESC', channel_id: 'ASC' },
      skip: offset,
      take: limit,
      relations: subChannelGetManyRelations,
    };
    const statsResults = await ChannelController.statsPopularityChannelService.getMany(
      topConfig,
      medium,
      category_id,
      { channelIds, excludeIds, minCountField: orderField }
    );
    return statsResults.map((row: { channel: Channel }) => row.channel).filter(Boolean);
  }
  /**
   * Subscribed Top: the ranked page, padded with the account's recent followed channels when it
   * is short (`fillTopPage`).
   */
  private static async loadFilledTopChannels(args: {
    category_id: number | null;
    channelIds?: number[];
    limit: number;
    medium: QueryParamsMedium;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Channel[]> {
    const { category_id, channelIds, limit, medium, offset, orderField } = args;

    return fillTopPage({
      countRanked: () =>
        ChannelController.statsPopularityChannelService.countRanked(
          medium,
          category_id,
          orderField,
          channelIds
        ),
      limit,
      loadRankedIds: () =>
        ChannelController.statsPopularityChannelService.getRankedChannelIds(
          medium,
          category_id,
          orderField,
          TOP_STATS_PAD_MAX_RANKED,
          channelIds
        ),
      loadRecent: (skip, take, excludeIds) => {
        const recentConfig: FindManyOptions<Channel> = {
          order: { channel_about: { last_pub_date: 'DESC' } },
          skip,
          take,
          relations: channelGetManyRelations,
        };
        return ChannelController.channelService.getMany(recentConfig, medium, category_id, {
          channelIds,
          excludeIds,
        });
      },
      loadStatsPage: () => ChannelController.loadRankedTopChannels(args),
      offset,
    });
  }

  static async getByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      try {
        const idOrIdText = getParamRequired(req, 'idOrIdText');
        const merged = await ChannelController.mergeRedirects.channelMove(idOrIdText);
        if (merged) {
          sendMergedInto(res, 'channel', merged.to_id_text);
          return;
        }
        const data: Channel | null = await ChannelController.channelService.getByIdOrIdText(
          idOrIdText,
          channelGetOneRelations
        );
        const parsedReadyChannel = ChannelController.isParsedReadyChannel(data) ? data : null;
        if (parsedReadyChannel) {
          await attachVerifiedPublishers({ channels: [parsedReadyChannel] });
        }
        handleReturnDataOrNotFound(res, parsedReadyChannel, 'Channel');
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getbyPodcastIndexId(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      podcast_index_id: Joi.string().required(),
    });

    validateParamsObject(schema, req, res, async (): Promise<void> => {
      try {
        const podcast_index_id = getParamRequired(req, 'podcast_index_id');
        const podcastIndexId = parseInt(podcast_index_id, 10);
        if (isNaN(podcastIndexId)) {
          res.status(400).json({ error: 'Invalid podcast_index_id' });
          return;
        }
        const survivorIdText =
          await ChannelController.mergeRedirects.survivorIdTextForPodcastIndexId(podcastIndexId);
        let lookupId = podcastIndexId;
        let lookupIdText = survivorIdText;
        if (!lookupIdText) {
          const aliasId =
            await ChannelController.allowlist.storedPodcastIndexIdForAlias(podcastIndexId);
          if (aliasId !== null) {
            lookupId = aliasId;
            lookupIdText =
              await ChannelController.mergeRedirects.survivorIdTextForPodcastIndexId(aliasId);
          }
        }
        const data: Channel | null = lookupIdText
          ? await ChannelController.channelService.getByIdText(lookupIdText, channelGetOneRelations)
          : await ChannelController.channelService.getByPodcastIndexId(
              lookupId,
              channelGetOneRelations
            );
        const parsedReadyChannel = ChannelController.isParsedReadyChannel(data) ? data : null;
        res.json(parsedReadyChannel || null);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getDirectoryMatch(req: Request, res: Response): Promise<void> {
    validateQueryObject(
      Joi.object(directoryMatchQuerySchema),
      req,
      res,
      async (): Promise<void> => {
        try {
          const feedGuidQuery = req.query.feed_guid;
          const feedUrlQuery = req.query.feed_url;
          if (typeof feedGuidQuery !== 'string') {
            res.status(400).json({ message: '"feed_guid" is required' });
            return;
          }
          const feedUrl = typeof feedUrlQuery === 'string' ? feedUrlQuery : null;
          const matches = await ChannelController.directoryMatchService.getForListedFeeds([
            { feedGuid: feedGuidQuery, feedUrl },
          ]);
          const match = matches.get(feedGuidQuery.trim().toLowerCase()) ?? null;
          // No match is null with 200 so a client can tell "not in the directory" from a failure.
          const body: DTOChannelDirectoryMatch | null =
            match === null
              ? null
              : {
                  id_text: match.channelIdText,
                  title: match.title,
                  medium_id: match.mediumId,
                };
          res.json(body);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      }
    );
  }

  static async matchAddByRSS(req: Request, res: Response): Promise<void> {
    validateBodyObject(addByRSSMatchBodySchema, req, res, async (): Promise<void> => {
      const feeds = readAddByRSSMatchFeeds(req.body);
      if (feeds === null) {
        res.status(400).json({ message: '"feeds" must be an array' });
        return;
      }
      const itemsAsked = feeds.reduce((sum, feed) => sum + feed.items.length, 0);
      if (itemsAsked > ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS) {
        res.status(400).json({
          message: `"items" must contain at most ${ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS} entries`,
        });
        return;
      }

      try {
        const foundByUrl = await ChannelController.directoryMatchService.getForFeedUrls(
          feeds.map((feed) => ({ feedUrl: feed.feed_url, feedGuid: feed.feed_guid }))
        );
        const matches: DTOAddByRSSMatchFeed[] = [];
        let feedsMatched = 0;
        let itemsMatched = 0;
        for (const feed of feeds) {
          const found = foundByUrl.get(feed.feed_url);
          if (found === undefined) {
            matches.push({ feed_url: feed.feed_url, channel: null, items: [] });
            continue;
          }
          feedsMatched += 1;
          const idTexts = await ChannelController.directoryMatchService.getItemIdTextsForChannel(
            found.channel,
            feed.items.map((item) => ({ guid: item.guid, enclosureUrl: item.enclosure_url }))
          );
          const items = feed.items.map((item, index) => {
            const itemIdText = idTexts[index] ?? null;
            if (itemIdText !== null) {
              itemsMatched += 1;
            }
            return {
              guid: item.guid,
              enclosure_url: item.enclosure_url,
              item_id_text: itemIdText,
            };
          });
          matches.push({ feed_url: feed.feed_url, channel: found.match, items });
        }
        loggerService.info('Add by RSS directory match', {
          feedsAsked: feeds.length,
          feedsMatched,
          itemsAsked,
          itemsMatched,
        });
        const body: DTOAddByRSSMatchResponse = { matches };
        res.json(body);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyGlobalRecent(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { medium } = req.query as {
          medium: QueryParamsMedium;
        };
        const category_id = null;
        const excludeIds = await ChannelController.browseExcludeIds(req);

        const recentConfig: FindManyOptions<Channel> = {
          order: { channel_about: { last_pub_date: 'DESC' } },
          skip: offset,
          take: pageLookaheadTake(limit),
          relations: channelGetManyRelations,
        };
        const channels = (
          await ChannelController.channelService.getMany(
            recentConfig,
            medium,
            category_id,
            excludeIds ? { excludeIds } : undefined
          )
        ).filter(Boolean);
        const lookahead = resolvePageLookahead(channels, limit, offset);

        const response: ApiListResponse<Channel> = {
          data: lookahead.rows,
          meta: { page, count: lookahead.count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyGlobalTop(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageRangeQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { range, medium } = req.query as {
          range: QueryParamsStatsRange;
          medium: QueryParamsMedium;
        };
        const category_id = null;
        const excludeIds = await ChannelController.browseExcludeIds(req);

        const orderField = getStatsOrder(range);
        const channels = await ChannelController.loadRankedTopChannels({
          category_id,
          excludeIds,
          limit: pageLookaheadTake(limit),
          medium,
          offset,
          orderField,
        });
        const lookahead = resolvePageLookahead(channels, limit, offset);

        const response: ApiListResponse<Channel> = {
          data: lookahead.rows,
          meta: { page, count: lookahead.count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  /**
   * Title search over stored directory channels. Answers only while the Podcast Index id
   * allowlist is set; the title match is unindexed, so an open instance never runs it.
   */
  static async searchByTitle(req: Request, res: Response): Promise<void> {
    if (config.catalog.podcastIndexIdAllowlist === null) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    validateQueryObject(Joi.object(channelTitleSearchQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { q, medium } = req.query as {
          q: string;
          medium: QueryParamsPodcastIndexSearchMedium;
        };
        const { channels, count } = await ChannelController.channelService.searchByTitle({
          term: q,
          mediumType: medium === 'music' ? 'music' : 'av',
          offset,
          limit,
        });
        const response: ApiListResponse<Channel> = {
          data: channels,
          meta: { page, count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyCategoryRecent(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumCategoryPageQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { category, medium } = req.query as {
          category: CategoryMappingKeys;
          medium: QueryParamsMedium;
        };
        const category_id = getCategoryEnumValue(category);
        const excludeIds = await ChannelController.browseExcludeIds(req);

        const recentConfig: FindManyOptions<Channel> = {
          order: { channel_about: { last_pub_date: 'DESC' } },
          skip: offset,
          take: pageLookaheadTake(limit),
          relations: channelGetManyRelations,
        };
        const recentResults = await ChannelController.channelService.getMany(
          recentConfig,
          medium,
          category_id,
          excludeIds ? { excludeIds } : undefined
        );
        const lookahead = resolvePageLookahead(recentResults.filter(Boolean), limit, offset);

        const response: ApiListResponse<Channel> = {
          data: lookahead.rows,
          meta: { page, count: lookahead.count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyCategoryTop(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumCategoryPageRangeQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { category, range, medium } = req.query as {
          category: CategoryMappingKeys;
          range: QueryParamsStatsRange;
          medium: QueryParamsMedium;
        };
        const category_id = getCategoryEnumValue(category);
        const excludeIds = await ChannelController.browseExcludeIds(req);

        const orderField = getStatsOrder(range);
        const channels = await ChannelController.loadRankedTopChannels({
          category_id,
          excludeIds,
          limit: pageLookaheadTake(limit),
          medium,
          offset,
          orderField,
        });
        const lookahead = resolvePageLookahead(channels, limit, offset);

        const response: ApiListResponse<Channel> = {
          data: lookahead.rows,
          meta: { page, count: lookahead.count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManySubscribedAZ(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const { medium } = req.query as {
              medium: QueryParamsMedium;
            };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;

            const channelIds = await getFollowedChannelIds(account_id, medium);
            let channels: Channel[] = [];
            let count = channelIds.length;

            if (channelIds.length) {
              const accountFollowingChannelService = new AccountFollowingChannelService();
              const order: FindManyOptions<AccountFollowingChannel>['order'] = {
                channel: { sortable_title: 'ASC' },
              };
              const config: FindManyOptions<AccountFollowingChannel> = {
                skip: offset,
                take: limit,
                relations: subChannelGetManyRelations,
                order,
              };

              const { results: followedResults, count: followedCount } =
                await accountFollowingChannelService.getFollowedChannelsWithCount(
                  Number(account_id),
                  medium,
                  config
                );
              count = followedCount ?? channelIds.length;
              channels = followedResults
                .map((f: { channel: Channel }) => f.channel)
                .filter(Boolean);
            }

            const response: ApiListResponse<Channel> = {
              data: channels,
              meta: { page, count, limit },
            };
            res.json(response);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        {
          skipMembershipStatus: true,
          apiKeyAccess: { resource: 'subscriptions', action: 'read' },
        }
      );
    });
  }

  static async getManySubscribedRecent(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const { medium } = req.query as {
              medium: QueryParamsMedium;
            };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;

            const channelIds = await getFollowedChannelIds(account_id, medium);
            let channels: Channel[] = [];
            let count = channelIds.length;

            if (channelIds.length) {
              const accountFollowingChannelService = new AccountFollowingChannelService();
              const order: FindManyOptions<AccountFollowingChannel>['order'] = {
                channel: { channel_about: { last_pub_date: 'DESC' } },
              };
              const config: FindManyOptions<AccountFollowingChannel> = {
                skip: offset,
                take: limit,
                relations: subChannelGetManyRelations,
                order,
              };

              const { results: followedResults, count: followedCount } =
                await accountFollowingChannelService.getFollowedChannelsWithCount(
                  Number(account_id),
                  medium,
                  config
                );
              count = followedCount ?? channelIds.length;
              channels = followedResults
                .map((f: { channel: Channel }) => f.channel)
                .filter(Boolean);
            }

            const response: ApiListResponse<Channel> = {
              data: channels,
              meta: { page, count, limit },
            };
            res.json(response);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        {
          skipMembershipStatus: true,
          apiKeyAccess: { resource: 'subscriptions', action: 'read' },
        }
      );
    });
  }

  static async getManySubscribedTop(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageRangeQuerySchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const { range, medium } = req.query as {
              range: QueryParamsStatsRange;
              medium: QueryParamsMedium;
            };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;

            const channelIds = await getFollowedChannelIds(account_id, medium);
            const count = channelIds.length;
            const channels = channelIds.length
              ? await ChannelController.loadFilledTopChannels({
                  category_id: null,
                  channelIds,
                  limit,
                  medium,
                  offset,
                  orderField: getStatsOrder(range),
                })
              : [];

            const response: ApiListResponse<Channel> = {
              data: channels,
              meta: { page, count, limit },
            };
            res.json(response);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        {
          skipMembershipStatus: true,
          apiKeyAccess: { resource: 'subscriptions', action: 'read' },
        }
      );
    });
  }
}

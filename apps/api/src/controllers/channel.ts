import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { sendMergedInto } from '@api/controllers/helpers/mergedInto.js';
import { getPaginationParams } from '@api/controllers/helpers/pagination.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getFollowedChannelIds } from '@api/lib/followed.js';
import { getParamRequired } from '@api/lib/params.js';
import { getStatsOrder } from '@api/lib/stats.js';
import {
  idOrIdTextParamSchema,
  mediumCategoryPageQuerySchema,
  mediumCategoryPageRangeQuerySchema,
  mediumPageQuerySchema,
  mediumPageRangeQuerySchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import { attachVerifiedPublishers } from '@api/lib/verifiedPublishers.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type {
  CategoryMappingKeys,
  DTOChannelDirectoryMatch,
  QueryParamsMedium,
  StatsPopularityCountField,
} from '@podverse/helpers';
import { fillTopPage, getCategoryEnumValue, TOP_STATS_PAD_MAX_RANKED } from '@podverse/helpers';
import type { ApiListResponse, QueryParamsStatsRange } from '@podverse/helpers-requests';
import type {
  AccountFollowingChannel,
  Channel,
  FindManyOptions,
  StatsPopularityChannel,
} from '@podverse/orm';
import {
  AccountFollowingChannelService,
  ChannelAddByRSSDirectoryMatchService,
  channelGetManyRelations,
  channelGetOneRelations,
  ChannelMergeRedirectService,
  ChannelService,
  StatsPopularityChannelService,
  subChannelGetManyRelations,
} from '@podverse/orm';

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
  private static statsPopularityChannelService = new StatsPopularityChannelService();

  private static isParsedReadyChannel(channel: Channel | null): channel is Channel {
    return Boolean(channel?.channel_about);
  }

  /**
   * One page of channels whose count for the range is above zero. Directory Top returns this page
   * as is, so a range with no count above zero is an empty list and a short page stays short.
   */
  private static async loadRankedTopChannels(args: {
    category_id: number | null;
    channelIds?: number[];
    limit: number;
    medium: QueryParamsMedium;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Channel[]> {
    const { category_id, channelIds, limit, medium, offset, orderField } = args;
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
      { channelIds, minCountField: orderField }
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
        const data: Channel | null = survivorIdText
          ? await ChannelController.channelService.getByIdText(
              survivorIdText,
              channelGetOneRelations
            )
          : await ChannelController.channelService.getByPodcastIndexId(
              podcastIndexId,
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

  static async getManyGlobalRecent(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { medium } = req.query as {
          medium: QueryParamsMedium;
        };
        const category_id = null;

        const recentConfig: FindManyOptions<Channel> = {
          order: { channel_about: { last_pub_date: 'DESC' } },
          skip: offset,
          take: limit,
          relations: channelGetManyRelations,
        };
        const channels = await ChannelController.channelService.getMany(
          recentConfig,
          medium,
          category_id
        );

        const response: ApiListResponse<Channel> = {
          data: channels.filter(Boolean),
          meta: { page, count: null, limit },
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

        const orderField = getStatsOrder(range);
        const channels = await ChannelController.loadRankedTopChannels({
          category_id,
          limit,
          medium,
          offset,
          orderField,
        });

        const response: ApiListResponse<Channel> = {
          data: channels,
          meta: { page, count: null, limit },
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

        const recentConfig: FindManyOptions<Channel> = {
          order: { channel_about: { last_pub_date: 'DESC' } },
          skip: offset,
          take: limit,
          relations: channelGetManyRelations,
        };
        const recentResults = await ChannelController.channelService.getMany(
          recentConfig,
          medium,
          category_id
        );
        const channels = recentResults.filter(Boolean);

        const response: ApiListResponse<Channel> = {
          data: channels,
          meta: { page, count: null, limit },
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

        const orderField = getStatsOrder(range);
        const channels = await ChannelController.loadRankedTopChannels({
          category_id,
          limit,
          medium,
          offset,
          orderField,
        });

        const response: ApiListResponse<Channel> = {
          data: channels,
          meta: { page, count: null, limit },
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

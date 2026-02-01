import { Request, Response } from 'express';
import Joi from 'joi';
import { getCategoryEnumValue, CategoryMappingKeys, QueryParamsMedium } from '@podverse/helpers';
import { ApiListResponse, QueryParamsStatsRange } from '@podverse/helpers-requests';
import {
  channelGetOneRelations,
  channelGetManyRelations,
  Channel,
  ChannelService,
  FindManyOptions,
  AccountFollowingChannelService,
  StatsAggregatedChannelService,
  AccountFollowingChannel,
  StatsAggregatedChannel,
  subChannelGetManyRelations,
} from '@podverse/orm';
import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';
import { getPaginationParams } from '@api/controllers/helpers/pagination';
import {
  idOrIdTextParamSchema,
  mediumCategoryPageQuerySchema,
  mediumCategoryPageRangeQuerySchema,
  mediumPageQuerySchema,
  mediumPageRangeQuerySchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';
import { getStatsOrder } from '@api/lib/stats';
import { getFollowedChannelIds } from '@api/lib/followed';
import { getParamRequired } from '@api/lib/params';

export class ChannelController {
  private static channelService = new ChannelService();
  private static statsAggregatedChannelService = new StatsAggregatedChannelService();

  static async getByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      try {
        const idOrIdText = getParamRequired(req, 'idOrIdText');
        const data: Channel | null = await ChannelController.channelService.getByIdOrIdText(
          idOrIdText,
          channelGetOneRelations
        );
        handleReturnDataOrNotFound(res, data, 'Channel');
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
        const data: Channel | null = await ChannelController.channelService.getByPodcastIndexId(
          podcastIndexId,
          channelGetOneRelations
        );
        res.json(data || null);
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
        const topConfig: FindManyOptions<StatsAggregatedChannel> = {
          order: { [orderField]: 'DESC' },
          skip: offset,
          take: limit,
          relations: subChannelGetManyRelations,
        };
        const statsResults = await ChannelController.statsAggregatedChannelService.getMany(
          topConfig,
          medium,
          category_id
        );
        const channels = statsResults.map((s: { channel: Channel }) => s.channel).filter(Boolean);

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
        const topConfig: FindManyOptions<StatsAggregatedChannel> = {
          order: { [orderField]: 'DESC' },
          skip: offset,
          take: limit,
          relations: subChannelGetManyRelations,
        };
        const statsResults = await ChannelController.statsAggregatedChannelService.getMany(
          topConfig,
          medium,
          category_id
        );
        const channels = statsResults.map((s: { channel: Channel }) => s.channel).filter(Boolean);

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
        { skipMembershipStatus: true }
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
        { skipMembershipStatus: true }
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
            let channels: Channel[] = [];
            let count = 0;

            if (channelIds.length) {
              const orderField = getStatsOrder(range);
              const config: FindManyOptions<StatsAggregatedChannel> = {
                order: { [orderField]: 'DESC' },
                skip: offset,
                take: limit,
                relations: subChannelGetManyRelations,
              };
              const results =
                await ChannelController.statsAggregatedChannelService.getManyByChannelsAndCount(
                  channelIds,
                  config
                );
              const statsResults = results[0];
              channels = statsResults.map((s: { channel: Channel }) => s.channel).filter(Boolean);
              count = results[1];
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
        { skipMembershipStatus: true }
      );
    });
  }
}

import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { getPaginationParams } from '@api/controllers/helpers/pagination.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { assignChapterEndTimes } from '@api/lib/chapters.js';
import { getFollowedChannelIds } from '@api/lib/followed.js';
import { getParamRequired } from '@api/lib/params.js';
import { getStatsOrder } from '@api/lib/stats.js';
import {
  idOrIdTextParamSchema,
  itemIdTextParamSchema,
  mediumCategoryPageQuerySchema,
  mediumCategoryPageRangeQuerySchema,
  mediumPageQuerySchema,
  mediumPageRangeQuerySchema,
  pageQuerySchema,
  pageRangeQuerySchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { CategoryMappingKeys, QueryParamsMedium } from '@podverse/helpers';
import { getCategoryEnumValue, LIVE_ITEM_STATUSES } from '@podverse/helpers';
import type {
  ApiListResponse,
  QueryParamsDirection,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';
import { emptyApiListResponse, QUERY_PARAMS_DIRECTION_VALUES } from '@podverse/helpers-requests';
import type {
  FindManyOptions,
  FindOptionsOrder,
  Item,
  ItemChapter,
  StatsAggregatedItem,
} from '@podverse/orm';
import {
  ChannelService,
  ItemChapterService,
  itemGetManyRelations,
  itemGetManyRelationsWithChannel,
  itemGetOneRelations,
  ItemService,
  StatsAggregatedItemService,
  subItemGetManyRelations,
  subItemGetManyRelationsWithChannel,
} from '@podverse/orm';
import { parseChapters } from '@podverse/parser';

const getRecentOrder = (itemType: 'normal' | 'live-item'): FindOptionsOrder<Item> => {
  if (itemType === 'live-item') {
    return { live_item: { start_time: 'DESC' } };
  }
  return { pub_date: 'DESC' };
};

export class ItemController {
  private static itemService: ItemService = new ItemService();
  private static itemChapterService: ItemChapterService = new ItemChapterService();
  private static channelService: ChannelService = new ChannelService();
  private static statsAggregatedItemService: StatsAggregatedItemService =
    new StatsAggregatedItemService();

  private static isParsedReadyChannel(channel: { channel_about?: unknown } | null): boolean {
    return Boolean(channel?.channel_about);
  }

  static async getByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      try {
        const idOrIdText = getParamRequired(req, 'idOrIdText');
        const data = await ItemController.itemService.getByIdOrIdText(
          idOrIdText,
          itemGetOneRelations
        );
        handleReturnDataOrNotFound(res, data, 'Item');
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyGlobalRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      ...mediumPageQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { medium, liveItemType: liveItemTypeParam } = req.query as {
          medium: QueryParamsMedium;
          liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
        };
        const category_id = null;
        const itemType = liveItemTypeParam ? 'live-item' : 'normal';
        const liveItemType = liveItemTypeParam || null;
        const order = getRecentOrder(itemType);

        const recentConfig: FindManyOptions<Item> = {
          order,
          skip: offset,
          take: limit,
          relations: itemGetManyRelationsWithChannel,
        };

        const items = await ItemController.itemService.getMany(
          recentConfig,
          medium,
          category_id,
          itemType,
          liveItemType
        );

        const response: ApiListResponse<Item> = {
          data: items.filter(Boolean),
          meta: { page, count: null, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyGlobalTop(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      ...mediumPageRangeQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const {
          range,
          medium,
          liveItemType: liveItemTypeParam,
        } = req.query as {
          range: QueryParamsStatsRange;
          medium: QueryParamsMedium;
          liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
        };
        const category_id = null;
        const itemType = liveItemTypeParam ? 'live-item' : 'normal';
        const liveItemType = liveItemTypeParam || null;

        const order = getStatsOrder(range);
        const config: FindManyOptions<StatsAggregatedItem> = {
          order: { [order]: 'DESC' },
          skip: offset,
          take: limit,
          relations: subItemGetManyRelationsWithChannel,
        };

        const statsResults = await ItemController.statsAggregatedItemService.getMany(
          config,
          medium,
          category_id,
          itemType,
          liveItemType
        );

        const items = statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);
        const response: ApiListResponse<Item> = {
          data: items,
          meta: { page, count: null, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyCategoryRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      ...mediumCategoryPageQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const {
          category,
          medium,
          liveItemType: liveItemTypeParam,
        } = req.query as {
          category: CategoryMappingKeys;
          medium: QueryParamsMedium;
          liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
        };
        const category_id = getCategoryEnumValue(category);
        const itemType = liveItemTypeParam ? 'live-item' : 'normal';
        const liveItemType = liveItemTypeParam || null;
        const order = getRecentOrder(itemType);

        const recentConfig: FindManyOptions<Item> = {
          order,
          skip: offset,
          take: limit,
          relations: itemGetManyRelationsWithChannel,
        };
        const recentResults = await ItemController.itemService.getMany(
          recentConfig,
          medium,
          category_id,
          itemType,
          liveItemType
        );
        const items = recentResults.filter(Boolean);

        const response: ApiListResponse<Item> = {
          data: items,
          meta: { page, count: null, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManyCategoryTop(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      ...mediumCategoryPageRangeQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const {
          category,
          range,
          medium,
          liveItemType: liveItemTypeParam,
        } = req.query as {
          category: CategoryMappingKeys;
          range: QueryParamsStatsRange;
          medium: QueryParamsMedium;
          liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
        };
        const category_id = getCategoryEnumValue(category);
        const itemType = liveItemTypeParam ? 'live-item' : 'normal';
        const liveItemType = liveItemTypeParam || null;

        const order = getStatsOrder(range);
        const config: FindManyOptions<StatsAggregatedItem> = {
          order: { [order]: 'DESC' },
          skip: offset,
          take: limit,
          relations: subItemGetManyRelationsWithChannel,
        };

        const statsResults = await ItemController.statsAggregatedItemService.getMany(
          config,
          medium,
          category_id,
          itemType,
          liveItemType
        );

        const items = statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);
        const response: ApiListResponse<Item> = {
          data: items,
          meta: { page, count: null, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManySubscribedRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      ...mediumPageQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async (): Promise<void> => {
      ensureAuthenticated(
        req,
        res,
        async (): Promise<void> => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const { medium, liveItemType: liveItemTypeParam } = req.query as {
              medium: QueryParamsMedium;
              liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
            };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const itemType = liveItemTypeParam ? 'live-item' : 'normal';
            const liveItemType = liveItemTypeParam || null;
            const order = getRecentOrder(itemType);

            const channel_ids = await getFollowedChannelIds(account_id, medium);
            if (!channel_ids.length) {
              const response: ApiListResponse<Item> = emptyApiListResponse;
              res.json(response);
              return;
            }

            const config: FindManyOptions<Item> = {
              order,
              skip: offset,
              take: limit,
              relations: itemGetManyRelationsWithChannel,
            };
            const items = await ItemController.itemService.getManyByChannels(
              channel_ids,
              itemType,
              liveItemType,
              config
            );

            const response: ApiListResponse<Item> = {
              data: items,
              meta: { page, count: null, limit },
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
    const schema = Joi.object({
      ...mediumPageRangeQuerySchema,
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .optional(),
    });

    validateQueryObject(schema, req, res, async (): Promise<void> => {
      ensureAuthenticated(
        req,
        res,
        async (): Promise<void> => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const {
              range,
              medium,
              liveItemType: liveItemTypeParam,
            } = req.query as {
              range: QueryParamsStatsRange;
              medium: QueryParamsMedium;
              liveItemType?: (typeof LIVE_ITEM_STATUSES)[number];
            };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const itemType = liveItemTypeParam ? 'live-item' : 'normal';
            const liveItemType = liveItemTypeParam || null;

            const channel_ids = await getFollowedChannelIds(account_id, medium);
            if (!channel_ids.length) {
              const response: ApiListResponse<Item> = emptyApiListResponse;
              res.json(response);
              return;
            }

            const order = getStatsOrder(range);
            const config: FindManyOptions<StatsAggregatedItem> = {
              order: { [order]: 'DESC' },
              skip: offset,
              take: limit,
              relations: subItemGetManyRelationsWithChannel,
            };
            const results =
              await ItemController.statsAggregatedItemService.getManyByChannelsAndCount(
                config,
                channel_ids,
                itemType,
                liveItemType
              );
            const statsResults = results[0];
            const count = results[1];
            const items = statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);

            const response: ApiListResponse<Item> = {
              data: items,
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

  static async getManyByChannelRecent(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(Joi.object(pageQuerySchema), req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
            relations: itemGetManyRelations,
            order: { pub_date: 'DESC' },
          };
          const items = await ItemController.itemService.getManyByChannel(channel, config);

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyByChannelOldest(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(Joi.object(pageQuerySchema), req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
            relations: itemGetManyRelations,
            order: { pub_date: 'ASC' },
          };
          const items = await ItemController.itemService.getManyByChannel(channel, config);

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyByChannelTop(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });
    const querySchema = Joi.object(pageRangeQuerySchema);

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');
          const { range } = req.query as {
            range: QueryParamsStatsRange;
          };
          const medium = null;
          const category_id = null;
          const itemType = 'normal';
          const liveItemType = null;

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const order = getStatsOrder(range);
          const config: FindManyOptions<StatsAggregatedItem> = {
            order: { [order]: 'DESC' },
            skip: offset,
            take: limit,
            relations: subItemGetManyRelations,
            where: { item: { channel: { id: channel.id } } },
          };
          const statsResults = await ItemController.statsAggregatedItemService.getMany(
            config,
            medium,
            category_id,
            itemType,
            liveItemType
          );
          const items = statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyByChannelBySeasonForward(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(Joi.object(pageQuerySchema), req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
          };
          const items = await ItemController.itemService.getManyByChannelBySeason(
            channel,
            'forward',
            config
          );

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyByChannelBySeasonBackward(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(Joi.object(pageQuerySchema), req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
          };
          const items = await ItemController.itemService.getManyByChannelBySeason(
            channel,
            'backward',
            config
          );

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyByChannelShuffle(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });
    const querySchema = Joi.object({
      ...pageQuerySchema,
      shuffleHash: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');
          const { shuffleHash } = req.query as { shuffleHash: string };

          const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
            channel_about: true,
          });

          if (!channel || !ItemController.isParsedReadyChannel(channel)) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
          };
          const items = await ItemController.itemService.getManyByChannelShuffle(
            channel,
            shuffleHash,
            config
          );

          res.json({
            data: items,
            meta: { page, count: channel.channel_about.episode_count, limit },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyForQueueByPubDate(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      idText: Joi.string().required(),
    });
    const querySchema = Joi.object({
      direction: Joi.string()
        .valid(...QUERY_PARAMS_DIRECTION_VALUES)
        .required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const { direction } = req.query as QueryParamsDirection;

          const items = await ItemController.itemService.getManyForQueueByPubDate(
            getParamRequired(req, 'idText'),
            direction
          );

          res.json(items);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async getManyForQueueBySeason(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      idText: Joi.string().required(),
    });
    const querySchema = Joi.object({
      direction: Joi.string()
        .valid(...QUERY_PARAMS_DIRECTION_VALUES)
        .required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const { direction } = req.query as QueryParamsDirection;

          const items = await ItemController.itemService.getManyForQueueBySeason(
            getParamRequired(req, 'idText'),
            direction
          );
          res.json(items);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      });
    });
  }

  static async parseAndGetChapters(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(itemIdTextParamSchema), req, res, async () => {
      const item_id_text = getParamRequired(req, 'item_id_text');
      try {
        const item = await ItemController.itemService.getByIdOrIdText(
          item_id_text,
          itemGetOneRelations
        );

        if (!item) {
          res.status(404).json({ message: 'Item not found' });
          return;
        }

        if (!item.item_chapters_feed) {
          res.status(204).end();
          return;
        }

        const lastFinished =
          item?.item_chapters_feed?.item_chapters_feed_log?.last_finished_parse_time;

        let chaptersAvailable = true;
        if (lastFinished) {
          const last = new Date(lastFinished).getTime();
          const now = Date.now();
          const diffMs = now - last;
          if (diffMs >= 1000 * 60 * 60) {
            const parseResult = await parseChapters(item);
            chaptersAvailable = parseResult.parsed;
          }
        } else {
          const parseResult = await parseChapters(item);
          chaptersAvailable = parseResult.parsed;
        }

        const updatedItem = (await ItemController.itemService.getByIdOrIdText(
          item_id_text,
          itemGetOneRelations
        )) as Item | null;

        if (!updatedItem || !updatedItem.item_chapters_feed) {
          res.status(404).json({ message: 'Item or Item Chapters Feed not found after parsing' });
          return;
        }

        const results = await ItemController.itemChapterService.getAllWithCount(
          updatedItem.item_chapters_feed,
          {
            order: { start_time: 'ASC' },
          }
        );

        const chapters = results.results;
        const transformed = assignChapterEndTimes(chapters);

        const response: ApiListResponse<ItemChapter> = {
          data: transformed,
          meta: {
            page: 1,
            count: transformed.length,
            limit: transformed.length,
            chaptersAvailable,
          },
        };

        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }
}

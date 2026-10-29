import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { sendMergedInto } from '@api/controllers/helpers/mergedInto.js';
import { getPaginationParams } from '@api/controllers/helpers/pagination.js';
import {
  ensureAuthenticated,
  getActiveSessionAccountId,
  getAuthenticatedUser,
} from '@api/lib/auth/index.js';
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
import {
  attachChannelListVerifiedPublishers,
  attachVerifiedPublishers,
} from '@api/lib/verifiedPublishers.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type {
  CategoryMappingKeys,
  DTOChannelGone,
  DTOItemDescriptionDetail,
  QueryParamsMedium,
  StatsPopularityCountField,
} from '@podverse/helpers';
import {
  CHANNEL_GONE_ARCHIVED_MESSAGE,
  fillTopPage,
  getCategoryEnumValue,
  LIVE_ITEM_STATUSES,
  TOP_STATS_PAD_MAX_RANKED,
} from '@podverse/helpers';
import type {
  ApiListResponse,
  QueryParamsDirection,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';
import { emptyApiListResponse, QUERY_PARAMS_DIRECTION_VALUES } from '@podverse/helpers-requests';
import type {
  Channel,
  FindManyOptions,
  FindOptionsOrder,
  Item,
  ItemChapter,
  StatsPopularityItem,
} from '@podverse/orm';
import {
  archivedShowFeedUrlForFollower,
  channelGetOneRelations,
  ChannelMergeRedirectService,
  ChannelService,
  FeedLifecycleStateKeyEnum,
  ItemChapterService,
  itemGetManyRelations,
  itemGetManyRelationsWithChannel,
  itemGetOneRelations,
  ItemService,
  StatsPopularityItemService,
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
  private static mergeRedirects = new ChannelMergeRedirectService();
  private static statsPopularityItemService: StatsPopularityItemService =
    new StatsPopularityItemService();

  private static isParsedReadyChannel(channel: { channel_about?: unknown } | null): boolean {
    return Boolean(channel?.channel_about);
  }

  /**
   * Merge redirect, then takedown, then archived. A missing or unparsed channel is 404.
   * Returns null when the response has already been sent.
   */
  private static async episodeListChannel(
    req: Request,
    res: Response,
    channelIdOrIdText: string
  ): Promise<Channel | null> {
    const move = await ItemController.mergeRedirects.channelMove(channelIdOrIdText);
    if (move) {
      sendMergedInto(res, 'channel', move.to_id_text);
      return null;
    }

    const channel = await ItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
      channel_about: true,
      feed: {
        feed_lifecycle_state: {
          feed_lifecycle_state_type: true,
        },
      },
    });
    if (!channel) {
      res.status(404).json({ message: 'Channel not found' });
      return null;
    }

    const stateKey = channel.feed?.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key;
    if (stateKey === FeedLifecycleStateKeyEnum.Takedown) {
      res.status(404).json({ message: 'Channel not found' });
      return null;
    }
    if (stateKey === FeedLifecycleStateKeyEnum.Archived) {
      const accountId = await getActiveSessionAccountId(req);
      const rawFeedUrl = channel.feed?.url ?? '';
      const addByRssFeedUrl =
        accountId === null || rawFeedUrl === ''
          ? null
          : await archivedShowFeedUrlForFollower(accountId, rawFeedUrl);
      const body: DTOChannelGone = {
        message: CHANNEL_GONE_ARCHIVED_MESSAGE,
        gone: {
          reason: 'archived',
          add_by_rss_feed_url: addByRssFeedUrl,
        },
      };
      res.status(410).json(body);
      return null;
    }

    if (!ItemController.isParsedReadyChannel(channel)) {
      res.status(404).json({ message: 'Channel not found' });
      return null;
    }

    return channel;
  }

  /**
   * One page of items whose count for the range is above zero. Directory Top returns this page as
   * is, so a range with no count above zero is an empty list and a short page stays short.
   */
  private static async loadRankedTopItems(args: {
    category_id: number | null;
    channelIds?: number[];
    includeChannel: boolean;
    itemType: 'normal' | 'live-item';
    limit: number;
    liveItemType: 'pending' | 'live' | 'ended' | null;
    medium: QueryParamsMedium | null;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Item[]> {
    const {
      category_id,
      channelIds,
      includeChannel,
      itemType,
      limit,
      liveItemType,
      medium,
      offset,
      orderField,
    } = args;
    const config: FindManyOptions<StatsPopularityItem> = {
      order: { [orderField]: 'DESC', item_id: 'ASC' },
      skip: offset,
      take: limit,
      relations: includeChannel ? subItemGetManyRelationsWithChannel : subItemGetManyRelations,
    };
    const statsResults = await ItemController.statsPopularityItemService.getMany(
      config,
      medium,
      category_id,
      itemType,
      liveItemType,
      { channelIds, minCountField: orderField }
    );
    return statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);
  }

  /**
   * Subscribed Top, a channel's episode Top, and live-item global and category Top: the ranked
   * page, padded with recent items from the same scope when it is short (`fillTopPage`). An empty
   * ranked page is that recent page, so rows whose count is zero stay in the list.
   */
  private static async loadFilledTopItems(args: {
    category_id: number | null;
    channelIds?: number[];
    itemType: 'normal' | 'live-item';
    limit: number;
    liveItemType: 'pending' | 'live' | 'ended' | null;
    medium: QueryParamsMedium | null;
    offset: number;
    orderField: StatsPopularityCountField;
    recentByChannel?: Channel;
  }): Promise<Item[]> {
    const {
      category_id,
      channelIds,
      itemType,
      limit,
      liveItemType,
      medium,
      offset,
      orderField,
      recentByChannel,
    } = args;

    return fillTopPage({
      countRanked: () =>
        ItemController.statsPopularityItemService.countRanked(
          medium,
          category_id,
          itemType,
          liveItemType,
          orderField,
          channelIds
        ),
      limit,
      loadRankedIds: () =>
        ItemController.statsPopularityItemService.getRankedItemIds(
          medium,
          category_id,
          itemType,
          liveItemType,
          orderField,
          TOP_STATS_PAD_MAX_RANKED,
          channelIds
        ),
      loadRecent: (skip, take, excludeIds) => {
        const recentConfig: FindManyOptions<Item> = {
          order: recentByChannel ? { pub_date: 'DESC' } : getRecentOrder(itemType),
          skip,
          take,
          relations: recentByChannel ? itemGetManyRelations : itemGetManyRelationsWithChannel,
        };
        if (recentByChannel) {
          return ItemController.itemService.getManyByChannel(recentByChannel, recentConfig, {
            excludeIds,
          });
        }
        if (channelIds?.length) {
          return ItemController.itemService.getManyByChannels(
            channelIds,
            itemType,
            liveItemType,
            recentConfig,
            { excludeIds }
          );
        }
        return ItemController.itemService.getMany(
          recentConfig,
          medium,
          category_id,
          itemType,
          liveItemType,
          { excludeIds }
        );
      },
      loadStatsPage: () =>
        ItemController.loadRankedTopItems({
          category_id,
          channelIds,
          includeChannel: recentByChannel === undefined,
          itemType,
          limit,
          liveItemType,
          medium,
          offset,
          orderField,
        }),
      offset,
    });
  }

  static async getByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      try {
        const idOrIdText = getParamRequired(req, 'idOrIdText');
        const merged = await ItemController.mergeRedirects.itemMove(idOrIdText);
        if (merged) {
          sendMergedInto(res, 'item', merged.to_id_text);
          return;
        }
        const data = await ItemController.itemService.getByIdOrIdText(
          idOrIdText,
          itemGetOneRelations
        );
        if (!data) {
          handleReturnDataOrNotFound(res, data, 'Item');
          return;
        }
        const channelMerged = await ItemController.mergeRedirects.channelMove(
          String(data.channel_id)
        );
        if (!channelMerged) {
          await attachVerifiedPublishers({ items: [data] });
          handleReturnDataOrNotFound(res, data, 'Item');
          return;
        }
        const channel = await ItemController.channelService.getByIdOrIdText(
          String(data.channel_id),
          channelGetOneRelations
        );
        if (channel) {
          await attachVerifiedPublishers({ channels: [channel], items: [data] });
          handleReturnDataOrNotFound(res, { ...data, channel }, 'Item');
          return;
        }
        await attachVerifiedPublishers({ items: [data] });
        handleReturnDataOrNotFound(res, data, 'Item');
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  /**
   * One item's full show notes. Loads only the description and about rows so clients can fetch
   * notes on demand without paying for the detail relation set. An item without a description
   * row answers 200 with null notes, so clients can cache the empty result.
   */
  static async getDescriptionByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      try {
        const idOrIdText = getParamRequired(req, 'idOrIdText');
        const merged = await ItemController.mergeRedirects.itemMove(idOrIdText);
        if (merged) {
          sendMergedInto(res, 'item', merged.to_id_text);
          return;
        }
        const item = await ItemController.itemService.getByIdOrIdText(idOrIdText, {
          item_about: true,
          item_description: true,
        });
        if (!item) {
          handleReturnDataOrNotFound(res, item, 'Item');
          return;
        }
        const description: Item['item_description'] | null | undefined = item.item_description;
        const about: Item['item_about'] | null | undefined = item.item_about;
        const body: DTOItemDescriptionDetail = {
          item_id_text: item.id_text,
          value: description?.value ?? null,
          preview: description?.preview ?? null,
          is_truncated: description?.is_truncated === true,
          source_length: description?.source_length ?? null,
          link_url: about?.website_link_url ?? null,
        };
        res.json(body);
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
        const data = items.filter(Boolean);
        await attachVerifiedPublishers({ items: data });

        const response: ApiListResponse<Item> = {
          data,
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

        const orderField = getStatsOrder(range);
        const items =
          itemType === 'live-item'
            ? await ItemController.loadFilledTopItems({
                category_id,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              })
            : await ItemController.loadRankedTopItems({
                category_id,
                includeChannel: true,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              });
        await attachVerifiedPublishers({ items });
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
        await attachVerifiedPublishers({ items });

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

        const orderField = getStatsOrder(range);
        const items =
          itemType === 'live-item'
            ? await ItemController.loadFilledTopItems({
                category_id,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              })
            : await ItemController.loadRankedTopItems({
                category_id,
                includeChannel: true,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              });
        await attachVerifiedPublishers({ items });
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
            await attachVerifiedPublishers({ items });

            const response: ApiListResponse<Item> = {
              data: items,
              meta: { page, count: null, limit },
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

            const items = await ItemController.loadFilledTopItems({
              category_id: null,
              channelIds: channel_ids,
              itemType,
              limit,
              liveItemType,
              medium,
              offset,
              orderField: getStatsOrder(range),
            });
            await attachVerifiedPublishers({ items });

            const response: ApiListResponse<Item> = {
              data: items,
              meta: { page, count: null, limit },
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

  static async getManyByChannelRecent(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      channelIdOrIdText: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      validateQueryObject(Joi.object(pageQuerySchema), req, res, async () => {
        try {
          const { page, limit, offset } = getPaginationParams(req);
          const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
            relations: itemGetManyRelations,
            order: { pub_date: 'DESC' },
          };
          const items = await ItemController.itemService.getManyByChannel(channel, config);
          await attachChannelListVerifiedPublishers({ channel, items });

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

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
            return;
          }

          const config: FindManyOptions<Item> = {
            skip: offset,
            take: limit,
            relations: itemGetManyRelations,
            order: { pub_date: 'ASC' },
          };
          const items = await ItemController.itemService.getManyByChannel(channel, config);
          await attachChannelListVerifiedPublishers({ channel, items });

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

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
            return;
          }

          const items = await ItemController.loadFilledTopItems({
            category_id,
            channelIds: [channel.id],
            itemType,
            limit,
            liveItemType,
            medium,
            offset,
            orderField: getStatsOrder(range),
            recentByChannel: channel,
          });
          await attachChannelListVerifiedPublishers({ channel, items });

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

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
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
          await attachChannelListVerifiedPublishers({ channel, items });

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

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
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
          await attachChannelListVerifiedPublishers({ channel, items });

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

          const channel = await ItemController.episodeListChannel(req, res, channelIdOrIdText);
          if (!channel) {
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
          await attachChannelListVerifiedPublishers({ channel, items });

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
          await attachVerifiedPublishers({ items });

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
          await attachVerifiedPublishers({ items });
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

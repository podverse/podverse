import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { getPaginationParams } from '@api/controllers/helpers/pagination.js';
import { ItemController } from '@api/controllers/item.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getFollowedChannelIds } from '@api/lib/followed.js';
import { getParamRequired } from '@api/lib/params.js';
import { mediumPageQuerySchema, validateQueryObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { ChannelLiveItemSortKey, QueryParamsMedium } from '@podverse/helpers';
import {
  compareChannelLiveItems,
  isLiveItemEndedAndStale,
  isPendingLiveItemStale,
  LIVE_ITEM_STATUSES,
  pageLookaheadTake,
  resolvePageLookahead,
} from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import { emptyApiListResponse } from '@podverse/helpers-requests';
import type { Item } from '@podverse/orm';
import {
  ChannelService,
  itemGetManyRelations,
  itemGetManyRelationsWithChannel,
  ItemService,
  LiveItemStatusEnum,
} from '@podverse/orm';

const toColumnTimeMs = (value: Date | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return new Date(value).getTime();
};

const listedChannelLiveStatus = (
  statusId: number | null | undefined
): LiveItemStatusEnum | null => {
  switch (statusId) {
    case LiveItemStatusEnum.Live:
      return LiveItemStatusEnum.Live;
    case LiveItemStatusEnum.Pending:
      return LiveItemStatusEnum.Pending;
    case LiveItemStatusEnum.Ended:
      return LiveItemStatusEnum.Ended;
    default:
      return null;
  }
};

const toChannelLiveItemSortKey = (item: Item): ChannelLiveItemSortKey => ({
  endTimeMs: toColumnTimeMs(item.live_item?.end_time),
  startTimeMs: toColumnTimeMs(item.live_item?.start_time),
  statusId: listedChannelLiveStatus(item.live_item?.live_item_status?.id),
});

export class LiveItemController {
  private static itemService = new ItemService();
  private static channelService = new ChannelService();

  static async getManyGlobalRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManyGlobalRecent(req, res);
    });
  }

  static async getManyGlobalTop(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManyGlobalTop(req, res);
    });
  }

  static async getManyCategoryRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManyCategoryRecent(req, res);
    });
  }

  static async getManyCategoryTop(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManyCategoryTop(req, res);
    });
  }

  static async getManySubscribedRecent(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManySubscribedRecent(req, res);
    });
  }

  static async getManySubscribedTop(req: Request, res: Response): Promise<void> {
    const schema = Joi.object({
      liveItemType: Joi.string()
        .valid(...LIVE_ITEM_STATUSES)
        .required(),
    }).unknown(true);

    validateQueryObject(schema, req, res, async () => {
      return ItemController.getManySubscribedTop(req, res);
    });
  }

  static async getManyGlobalUpcoming(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema).unknown(true), req, res, async () => {
      try {
        const { page, limit, offset } = getPaginationParams(req);
        const { medium } = req.query as { medium: QueryParamsMedium };
        const loaded = await LiveItemController.itemService.getManyUpcomingLiveItems(
          {
            skip: offset,
            take: pageLookaheadTake(limit),
            relations: itemGetManyRelationsWithChannel,
          },
          { channelIds: null, mediumType: medium }
        );
        const lookahead = resolvePageLookahead(loaded, limit, offset);
        const response: ApiListResponse<Item> = {
          data: lookahead.rows,
          meta: { page, count: lookahead.count, limit },
        };
        res.json(response);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getManySubscribedUpcoming(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageQuerySchema).unknown(true), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async (): Promise<void> => {
          try {
            const { page, limit, offset } = getPaginationParams(req);
            const { medium } = req.query as { medium: QueryParamsMedium };
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const channelIds = await getFollowedChannelIds(account_id, medium);
            if (!channelIds.length) {
              const response: ApiListResponse<Item> = emptyApiListResponse;
              res.json(response);
              return;
            }

            const loaded = await LiveItemController.itemService.getManyUpcomingLiveItems(
              {
                skip: offset,
                take: pageLookaheadTake(limit),
                relations: itemGetManyRelationsWithChannel,
              },
              { channelIds, mediumType: medium }
            );
            const lookahead = resolvePageLookahead(loaded, limit, offset);
            const response: ApiListResponse<Item> = {
              data: lookahead.rows,
              meta: { page, count: lookahead.count, limit },
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

  static async getManyByChannel(req: Request, res: Response): Promise<void> {
    const channelIdOrIdText = getParamRequired(req, 'channelIdOrIdText');

    const channel = await LiveItemController.channelService.getByIdOrIdText(channelIdOrIdText, {
      channel_about: true,
    });
    if (!channel || !channel.channel_about) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const allItems = await LiveItemController.itemService.getManyByChannelWithLiveItem(channel, {
      relations: itemGetManyRelations,
    });

    // Hide livestreams that ended more than a day ago, and scheduled ones whose start is more
    // than a day past. Live items stay listed at any age.
    const items = allItems.filter(
      (item) =>
        !item.live_item ||
        (!isLiveItemEndedAndStale(item.live_item) &&
          !isPendingLiveItemStale(toChannelLiveItemSortKey(item)))
    );

    const sorted = items
      .filter((item) => listedChannelLiveStatus(item.live_item?.live_item_status?.id) !== null)
      .sort((left, right) =>
        compareChannelLiveItems(toChannelLiveItemSortKey(left), toChannelLiveItemSortKey(right))
      );

    res.json(sorted);
  }
}

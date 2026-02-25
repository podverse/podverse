import type { Request, Response } from 'express';
import Joi from 'joi';
import type {
  ApiListResponse,
  QueryParamsItemSoundbitesByChannelSort,
  QueryParamsItemSoundbitesByItemSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES,
  QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES,
} from '@podverse/helpers-requests';
import type { ItemSoundbite } from '@podverse/orm';
import { ItemSoundbiteService } from '@podverse/orm';
import { handleGenericErrorResponse } from './helpers/error.js';
import {
  channelIdTextParamSchema,
  itemIdTextParamSchema,
  itemSoundbiteIdTextParamSchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import { getPaginationParams } from './helpers/pagination.js';
import { getParamRequired } from '@api/lib/params.js';

const itemSoundbiteService = new ItemSoundbiteService();

export class ItemSoundbiteController {
  static async getItemSoundbiteById(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(itemSoundbiteIdTextParamSchema), req, res, async () => {
      try {
        const item_soundbite_id_text = getParamRequired(req, 'item_soundbite_id_text');
        const itemSoundbite = await itemSoundbiteService.getByIdText(item_soundbite_id_text, {
          relations: ['item'],
        });
        if (itemSoundbite) {
          res.status(200).json(itemSoundbite);
        } else {
          res.status(404).json({ message: 'Item soundbite not found' });
        }
      } catch (err) {
        handleGenericErrorResponse(res, err);
      }
    });
  }

  static async getManyByChannelIdText(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      sort: Joi.string()
        .valid(...QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES)
        .optional(),
    });

    validateParamsObject(Joi.object(channelIdTextParamSchema), req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const channel_id_text = getParamRequired(req, 'channel_id_text');
          const { page, limit, offset } = getPaginationParams(req);
          const { sort } = req.query as {
            sort?: QueryParamsItemSoundbitesByChannelSort;
          };

          let order: { item: { pub_date: 'DESC' | 'ASC' } } = { item: { pub_date: 'DESC' } };
          if (sort === 'oldest') {
            order = { item: { pub_date: 'ASC' } };
          }

          const [item_soundbites, count] = await itemSoundbiteService.getManyAndCount({
            where: {
              item: {
                channel: { id_text: channel_id_text },
              },
            },
            order,
            skip: offset,
            take: limit,
            relations: [
              'item',
              'item.item_enclosures',
              'item.item_enclosures.item_enclosure_sources',
              'item.item_images',
            ],
          });

          const response: ApiListResponse<ItemSoundbite> = {
            data: item_soundbites,
            meta: { page, count, limit },
          };

          res.status(200).json(response);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      });
    });
  }

  static async getManyByItemIdText(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      sort: Joi.string()
        .valid(...QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES)
        .optional(),
    });

    validateParamsObject(Joi.object(itemIdTextParamSchema), req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        try {
          const item_id_text = getParamRequired(req, 'item_id_text');
          const { page, limit, offset } = getPaginationParams(req);
          const { sort } = req.query as {
            sort?: QueryParamsItemSoundbitesByItemSort;
          };

          let order: { item: { pub_date: 'DESC' | 'ASC' } } = { item: { pub_date: 'DESC' } };
          if (sort === 'oldest') {
            order = { item: { pub_date: 'ASC' } };
          }

          const [item_soundbites, count] = await itemSoundbiteService.getManyAndCount({
            where: {
              item: { id_text: item_id_text },
            },
            order,
            skip: offset,
            take: limit,
            relations: [
              'item',
              'item.item_enclosures',
              'item.item_enclosures.item_enclosure_sources',
              'item.item_images',
            ],
          });

          const response: ApiListResponse<ItemSoundbite> = {
            data: item_soundbites,
            meta: { page, count, limit },
          };

          res.status(200).json(response);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      });
    });
  }
}

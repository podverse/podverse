import { getActiveSessionAccountId } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  idOrIdTextParamSchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { isPersonContentChip, type StatsPopularityRange } from '@podverse/helpers';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';
import { ChannelService, PersonNotFoundError, PersonService } from '@podverse/orm';

import { handleGenericErrorResponse } from './helpers/error.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  page: Joi.number().integer().min(1).default(1),
  q: Joi.string().allow('').default(''),
  range: Joi.string()
    .valid(...QUERY_PARAMS_STATS_RANGE_VALUES)
    .default('week'),
  sort: Joi.string().valid('recent', 'top').default('recent'),
});

const pageQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  page: Joi.number().integer().min(1).default(1),
});

const contentQuerySchema = pageQuerySchema.keys({
  chip: Joi.string().required(),
  range: Joi.string()
    .valid(...QUERY_PARAMS_STATS_RANGE_VALUES)
    .default('week'),
  sort: Joi.string().valid('recent', 'top').default('recent'),
});

const idTextParamSchema = Joi.object({
  id_text: Joi.string().min(7).max(15).required(),
});

type PageQuery = { limit: number; page: number };

type ListQuery = PageQuery & {
  q: string;
  range: StatsPopularityRange;
  sort: 'recent' | 'top';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPage(value: unknown): PageQuery | null {
  if (!isRecord(value) || typeof value.page !== 'number' || typeof value.limit !== 'number') {
    return null;
  }
  return { limit: value.limit, page: value.page };
}

function readRange(value: unknown): StatsPopularityRange | null {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'all-time') {
    return value;
  }
  return null;
}

function readSorted(value: unknown): {
  limit: number;
  page: number;
  range: StatsPopularityRange;
  sort: 'recent' | 'top';
} | null {
  const page = readPage(value);
  if (page === null || !isRecord(value) || (value.sort !== 'recent' && value.sort !== 'top')) {
    return null;
  }
  const range = readRange(value.range);
  if (range === null) {
    return null;
  }
  return { ...page, range, sort: value.sort };
}

function readList(value: unknown): ListQuery | null {
  const page = readPage(value);
  if (page === null || !isRecord(value) || (value.sort !== 'recent' && value.sort !== 'top')) {
    return null;
  }
  const range = readRange(value.range);
  if (range === null || typeof value.q !== 'string') {
    return null;
  }
  return { ...page, q: value.q, range, sort: value.sort };
}

class PersonController {
  private static people = new PersonService();
  private static channelService = new ChannelService();

  static async list(req: Request, res: Response): Promise<void> {
    validateQueryObject(listQuerySchema, req, res, async () => {
      const query = readList(req.query);
      if (query === null) {
        res.status(400).json({ message: 'Validation error' });
        return;
      }
      try {
        const { people, count } = await PersonController.people.list({
          accountId: await getActiveSessionAccountId(req),
          limit: query.limit,
          page: query.page,
          query: query.q,
          range: query.range,
          sort: query.sort,
        });
        res.json({ data: people, meta: { count, limit: query.limit, page: query.page } });
      } catch (err) {
        handleGenericErrorResponse(res, err);
      }
    });
  }

  static async getByIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(idTextParamSchema, req, res, async () => {
      try {
        const person = await PersonController.people.getByIdText(
          getParamRequired(req, 'id_text'),
          await getActiveSessionAccountId(req)
        );
        res.json(person);
      } catch (err) {
        if (err instanceof PersonNotFoundError) {
          res.status(404).json({ message: 'Person not found' });
          return;
        }
        handleGenericErrorResponse(res, err);
      }
    });
  }

  static async channels(req: Request, res: Response): Promise<void> {
    validateParamsObject(idTextParamSchema, req, res, async () => {
      validateQueryObject(contentQuerySchema, req, res, async () => {
        const query = readSorted(req.query);
        if (query === null || !isRecord(req.query) || typeof req.query.chip !== 'string') {
          res.status(400).json({ message: 'Validation error' });
          return;
        }
        if (
          req.query.chip !== 'podcasts' &&
          req.query.chip !== 'albums' &&
          req.query.chip !== 'artists'
        ) {
          res.status(400).json({ message: 'Validation error' });
          return;
        }
        const chip = req.query.chip;
        try {
          const result = await PersonController.people.channels({
            chip,
            idText: getParamRequired(req, 'id_text'),
            limit: query.limit,
            page: query.page,
            range: query.range,
            sort: query.sort,
          });
          res.json({
            data: result.channels,
            meta: { count: result.count, limit: query.limit, page: query.page },
          });
        } catch (err) {
          if (err instanceof PersonNotFoundError) {
            res.status(404).json({ message: 'Person not found' });
            return;
          }
          handleGenericErrorResponse(res, err);
        }
      });
    });
  }

  static async items(req: Request, res: Response): Promise<void> {
    validateParamsObject(idTextParamSchema, req, res, async () => {
      validateQueryObject(contentQuerySchema, req, res, async () => {
        const query = readSorted(req.query);
        if (
          query === null ||
          !isRecord(req.query) ||
          typeof req.query.chip !== 'string' ||
          !isPersonContentChip(req.query.chip)
        ) {
          res.status(400).json({ message: 'Validation error' });
          return;
        }
        if (
          req.query.chip !== 'episodes' &&
          req.query.chip !== 'tracks' &&
          req.query.chip !== 'livestreams'
        ) {
          res.status(400).json({ message: 'Validation error' });
          return;
        }
        const chip = req.query.chip;
        try {
          const result = await PersonController.people.items({
            chip,
            idText: getParamRequired(req, 'id_text'),
            limit: query.limit,
            page: query.page,
            range: query.range,
            sort: query.sort,
          });
          res.json({
            data: result.items,
            meta: { count: result.count, limit: query.limit, page: query.page },
          });
        } catch (err) {
          if (err instanceof PersonNotFoundError) {
            res.status(404).json({ message: 'Person not found' });
            return;
          }
          handleGenericErrorResponse(res, err);
        }
      });
    });
  }

  static async appearances(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      validateQueryObject(pageQuerySchema, req, res, async () => {
        const query = readPage(req.query);
        if (query === null) {
          res.status(400).json({ message: 'Validation error' });
          return;
        }
        try {
          const channel = await PersonController.channelService.getByIdOrIdText(
            getParamRequired(req, 'idOrIdText')
          );
          if (channel === null) {
            res.status(404).json({ message: 'Channel not found' });
            return;
          }
          const result = await PersonController.people.appearances(
            channel.id,
            query.page,
            query.limit
          );
          res.json({
            data: result.appearances,
            meta: { count: result.count, limit: query.limit, page: query.page },
          });
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      });
    });
  }
}

export { PersonController };

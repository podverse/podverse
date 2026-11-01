import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import type { AuthenticatedRequestOptions } from '@api/lib/auth/index.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject, validateQueryObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { isRecommendationChip } from '@podverse/helpers';
import { TasteProfileAccountService } from '@podverse/orm';

const TASTE_PROFILE_DEFAULT_LIMIT = 20;
const TASTE_PROFILE_MAX_LIMIT = 50;

const tasteProfileReadAuthOptions: AuthenticatedRequestOptions = {
  skipMembershipStatus: true,
  apiKeyAccess: { resource: 'history', action: 'read' },
};

const tasteProfileUpdateAuthOptions: AuthenticatedRequestOptions = {
  skipMembershipStatus: true,
  apiKeyAccess: { resource: 'history', action: 'update' },
};

const pageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(TASTE_PROFILE_MAX_LIMIT)
    .default(TASTE_PROFILE_DEFAULT_LIMIT),
});

const hideBodySchema = Joi.object({
  channel_id_text: Joi.string().required(),
});

const unhideBodySchema = Joi.object({
  channel_id_text: Joi.string().required(),
  add_to_taste_profile: Joi.boolean().required(),
});

const recommendationsQuerySchema = Joi.object({
  chip: Joi.string().valid('podcasts', 'albums', 'artists').default('podcasts'),
});

const weightBodySchema = Joi.object({
  channel_id_text: Joi.string().required(),
  weight: Joi.number().integer().min(1).max(5).required(),
});

type TasteProfilePage = { page: number; limit: number };

type HideShowBody = { channel_id_text: string };

type UnhideShowBody = { channel_id_text: string; add_to_taste_profile: boolean };

function readQueryInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function readTasteProfilePage(value: unknown): TasteProfilePage | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const page = readQueryInteger(Reflect.get(value, 'page'));
  const limit = readQueryInteger(Reflect.get(value, 'limit'));
  if (page === null || limit === null) {
    return null;
  }
  return { page, limit };
}

type WeightBody = { channel_id_text: string; weight: number };

function readRecommendationChip(value: unknown): 'podcasts' | 'albums' | 'artists' | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const chip = Reflect.get(value, 'chip');
  if (chip === undefined) {
    return 'podcasts';
  }
  if (typeof chip !== 'string' || !isRecommendationChip(chip)) {
    return null;
  }
  return chip;
}

function isWeightBody(value: unknown): value is WeightBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const weight = Reflect.get(value, 'weight');
  return (
    typeof Reflect.get(value, 'channel_id_text') === 'string' &&
    typeof weight === 'number' &&
    Number.isInteger(weight) &&
    weight >= 1 &&
    weight <= 5
  );
}

function isHideShowBody(value: unknown): value is HideShowBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return typeof Reflect.get(value, 'channel_id_text') === 'string';
}

function isUnhideShowBody(value: unknown): value is UnhideShowBody {
  if (!isHideShowBody(value)) {
    return false;
  }
  return typeof Reflect.get(value, 'add_to_taste_profile') === 'boolean';
}

function totalPages(total_count: number, limit: number): number {
  return total_count === 0 ? 0 : Math.ceil(total_count / limit);
}

export class AccountTasteProfileController {
  private static tasteProfileAccountService = new TasteProfileAccountService();

  static async list(req: Request, res: Response): Promise<void> {
    validateQueryObject(pageQuerySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const pageQuery = readTasteProfilePage(req.query);
            if (pageQuery === null) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const { page, limit } = pageQuery;
            const { rows, total_count } =
              await AccountTasteProfileController.tasteProfileAccountService.listForAccount(
                jwtUser.id,
                { limit, offset: (page - 1) * limit }
              );
            res.json({
              data: {
                items: rows,
                pagination: {
                  page,
                  total_count,
                  total_pages: totalPages(total_count, limit),
                },
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileReadAuthOptions
      );
    });
  }

  static async listHidden(req: Request, res: Response): Promise<void> {
    validateQueryObject(pageQuerySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const pageQuery = readTasteProfilePage(req.query);
            if (pageQuery === null) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const { page, limit } = pageQuery;
            const { rows, total_count } =
              await AccountTasteProfileController.tasteProfileAccountService.listHiddenForAccount(
                jwtUser.id,
                { limit, offset: (page - 1) * limit }
              );
            res.json({
              data: {
                items: rows,
                pagination: {
                  page,
                  total_count,
                  total_pages: totalPages(total_count, limit),
                },
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileReadAuthOptions
      );
    });
  }

  static async hide(req: Request, res: Response): Promise<void> {
    validateBodyObject(hideBodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const body: unknown = req.body;
            if (!isHideShowBody(body)) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const result =
              await AccountTasteProfileController.tasteProfileAccountService.hideForAccount(
                jwtUser.id,
                body.channel_id_text
              );
            if (result.status === 'channel_not_found') {
              res.status(404).json({ message: 'Channel not found' });
              return;
            }
            if (result.status === 'not_in_taste_profile') {
              res.status(404).json({ message: 'Show is not in the Taste Profile' });
              return;
            }
            res.json({
              data: {
                channel_id_text: body.channel_id_text,
                hidden: true,
                in_taste_profile: false,
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileUpdateAuthOptions
      );
    });
  }

  static async unhide(req: Request, res: Response): Promise<void> {
    validateBodyObject(unhideBodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const body: unknown = req.body;
            if (!isUnhideShowBody(body)) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const result =
              await AccountTasteProfileController.tasteProfileAccountService.unhideForAccount(
                jwtUser.id,
                body.channel_id_text,
                body.add_to_taste_profile
              );
            if (result.status === 'channel_not_found') {
              res.status(404).json({ message: 'Channel not found' });
              return;
            }
            res.json({
              data: {
                channel_id_text: body.channel_id_text,
                hidden: result.hidden,
                in_taste_profile: result.in_taste_profile,
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileUpdateAuthOptions
      );
    });
  }

  static async listRecommendations(req: Request, res: Response): Promise<void> {
    validateQueryObject(recommendationsQuerySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const chip = readRecommendationChip(req.query);
            if (chip === null) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const items =
              await AccountTasteProfileController.tasteProfileAccountService.listRecommendationsForAccount(
                jwtUser.id,
                chip
              );
            res.json({ data: { items } });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileReadAuthOptions
      );
    });
  }

  static async listChannelHidden(req: Request, res: Response): Promise<void> {
    validateQueryObject(pageQuerySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const pageQuery = readTasteProfilePage(req.query);
            if (pageQuery === null) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const { page, limit } = pageQuery;
            const { rows, total_count } =
              await AccountTasteProfileController.tasteProfileAccountService.listChannelHiddenForAccount(
                jwtUser.id,
                { limit, offset: (page - 1) * limit }
              );
            res.json({
              data: {
                items: rows,
                pagination: {
                  page,
                  total_count,
                  total_pages: totalPages(total_count, limit),
                },
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileReadAuthOptions
      );
    });
  }

  static async hideChannelFromLists(req: Request, res: Response): Promise<void> {
    validateBodyObject(hideBodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const body: unknown = req.body;
            if (!isHideShowBody(body)) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const result =
              await AccountTasteProfileController.tasteProfileAccountService.hideChannelFromListsForAccount(
                jwtUser.id,
                body.channel_id_text
              );
            if (result.status === 'channel_not_found') {
              res.status(404).json({ message: 'Channel not found' });
              return;
            }
            if (result.status === 'no_listener') {
              res.status(404).json({ message: 'No Taste Profile listener' });
              return;
            }
            res.json({
              data: {
                channel_id_text: body.channel_id_text,
                hidden: true,
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileUpdateAuthOptions
      );
    });
  }

  static async unhideChannelFromLists(req: Request, res: Response): Promise<void> {
    validateBodyObject(hideBodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const body: unknown = req.body;
            if (!isHideShowBody(body)) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const result =
              await AccountTasteProfileController.tasteProfileAccountService.unhideChannelFromListsForAccount(
                jwtUser.id,
                body.channel_id_text
              );
            if (result.status === 'channel_not_found') {
              res.status(404).json({ message: 'Channel not found' });
              return;
            }
            if (result.status === 'no_listener') {
              res.status(404).json({ message: 'No Taste Profile listener' });
              return;
            }
            res.json({
              data: {
                channel_id_text: body.channel_id_text,
                hidden: false,
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileUpdateAuthOptions
      );
    });
  }

  static async setWeight(req: Request, res: Response): Promise<void> {
    validateBodyObject(weightBodySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const body: unknown = req.body;
            if (!isWeightBody(body)) {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const jwtUser = getAuthenticatedUser(req);
            const result =
              await AccountTasteProfileController.tasteProfileAccountService.setWeightForAccount(
                jwtUser.id,
                body.channel_id_text,
                body.weight
              );
            if (result.status === 'channel_not_found') {
              res.status(404).json({ message: 'Channel not found' });
              return;
            }
            if (result.status === 'not_in_taste_profile') {
              res.status(404).json({ message: 'Show is not in the Taste Profile' });
              return;
            }
            res.json({
              data: {
                channel_id_text: body.channel_id_text,
                weight: result.weight,
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        tasteProfileUpdateAuthOptions
      );
    });
  }
}

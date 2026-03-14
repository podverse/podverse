import { handleReturnDataOrNotFound } from '@api/controllers/helpers/data.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { getParamRequired } from '@api/lib/params.js';
import { validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { CategoryService } from '@podverse/orm';

export class CategoryController {
  private static categoryService = new CategoryService();

  static async get(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      id: Joi.number().integer().min(1).required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      try {
        const id = getParamRequired(req, 'id');
        const numericId = parseInt(id, 10);
        const data = await CategoryController.categoryService.get(numericId);
        handleReturnDataOrNotFound(res, data, 'Category');
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }

  static async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await CategoryController.categoryService.getAll();
      res.json({ data: categories });
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }
}

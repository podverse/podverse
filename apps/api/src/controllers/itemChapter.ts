import type { Request, Response } from 'express';
import Joi from 'joi';
import { ItemChapterService } from '@podverse/orm';
import { handleGenericErrorResponse } from './helpers/error.js';
import { validateParamsObject } from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

const itemChapterService = new ItemChapterService();

export class ItemChapterController {
  static async getItemChapterByIdText(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      item_chapter_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      try {
        const item_chapter_id_text = getParamRequired(req, 'item_chapter_id_text');
        const itemChapter = await itemChapterService.getByIdText(item_chapter_id_text, {
          relations: ['item_chapters_feed', 'item_chapters_feed.item'],
        });
        if (itemChapter) {
          res.status(200).json(itemChapter);
        } else {
          res.status(404).json({ message: 'Item chapter not found' });
        }
      } catch (err) {
        handleGenericErrorResponse(res, err);
      }
    });
  }
}

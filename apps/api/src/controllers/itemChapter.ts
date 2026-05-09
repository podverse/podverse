import { getParamRequired } from '@api/lib/params.js';
import { validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { ItemChapterService } from '@podverse/orm';

import { itemChapterEntityToDto } from '../lib/itemChapterApiSerialization.js';
import { handleGenericErrorResponse } from './helpers/error.js';

export class ItemChapterController {
  private static itemChapterService = new ItemChapterService();

  static async getItemChapterByIdText(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      item_chapter_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      try {
        const item_chapter_id_text = getParamRequired(req, 'item_chapter_id_text');
        const itemChapter =
          await ItemChapterController.itemChapterService.getByIdText(item_chapter_id_text);

        if (!itemChapter) {
          res.status(404).json({ message: 'Item chapter not found' });
          return;
        }

        const parentItem = itemChapter.item_chapters_object?.item_chapters_feed?.item;
        if (!parentItem) {
          res.status(404).json({ message: 'Item chapter parent item not found' });
          return;
        }

        res.status(200).json(itemChapterEntityToDto(itemChapter));
      } catch (err) {
        handleGenericErrorResponse(res, err);
      }
    });
  }
}

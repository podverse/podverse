import { normalizeTranscriptResponseData } from '@api/lib/transcript.js';
import { itemIdTextParamSchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';
import { ItemTranscriptService } from '@podverse/orm';
import { _request } from '../lib/_request.js';
import { getParamRequired } from '@api/lib/params.js';

export class ItemTranscriptController {
  private static itemTranscriptService = new ItemTranscriptService();

  static async getByIdOrIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(itemIdTextParamSchema), req, res, async () => {
      const item_id_text = getParamRequired(req, 'item_id_text');

      const options = {
        where: {
          item: {
            id_text: item_id_text,
          },
        },
      };
      const result = await ItemTranscriptController.itemTranscriptService.getMany(options);

      const item_transcript = result.length > 0 ? result[0] : null;

      if (!item_transcript || !item_transcript.url) {
        res.status(404).json({ message: 'Transcript not found' });
        return;
      }

      try {
        const transcriptResponse = await _request(item_transcript.url);
        const data = normalizeTranscriptResponseData(transcriptResponse.data);
        res.json({ data });
      } catch (error) {
        res.status(500).json({
          message: 'Failed to fetch transcript data',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}

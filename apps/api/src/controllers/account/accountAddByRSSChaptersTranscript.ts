import type { Request, Response } from 'express';
import Joi from 'joi';
import type { AddByRSSChapterResponse } from '@podverse/helpers-requests';
import { compatParsedChapters } from '@podverse/parser-mapping';
import type { PIChapter } from '@podverse/parser-mapping';
import { assignChapterEndTimes } from '@api/lib/chapters.js';
import { _request } from '@api/lib/_request.js';
import { normalizeTranscriptResponseData } from '@api/lib/transcript.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { validateBodyObject } from '@api/lib/validation/index.js';

const bodySchema = Joi.object({
  itemIdText: Joi.string().required(),
  chaptersFeedUrl: Joi.string().uri().optional().allow(''),
  transcriptUrl: Joi.string().uri().optional().allow(''),
});

export class AccountAddByRSSChaptersTranscriptController {
  /**
   * On-demand chapters and transcript for add-by-RSS.
   * Client sends URLs from the bundle (chaptersFeedUrl, transcriptUrl); backend fetches and parses
   * server-side (avoids CORS). No ownership verification.
   */
  static async getChaptersAndTranscript(req: Request, res: Response): Promise<void> {
    validateBodyObject(bodySchema, req, res, async () => {
      const { itemIdText, chaptersFeedUrl, transcriptUrl } = req.body as {
        itemIdText: string;
        chaptersFeedUrl?: string;
        transcriptUrl?: string;
      };

      const chaptersFeedUrlTrimmed =
        typeof chaptersFeedUrl === 'string' && chaptersFeedUrl.trim() !== ''
          ? chaptersFeedUrl.trim()
          : undefined;
      const transcriptUrlTrimmed =
        typeof transcriptUrl === 'string' && transcriptUrl.trim() !== ''
          ? transcriptUrl.trim()
          : undefined;

      if (!chaptersFeedUrlTrimmed && !transcriptUrlTrimmed) {
        res.status(400).json({
          message: 'At least one of chaptersFeedUrl or transcriptUrl is required',
        });
        return;
      }

      try {
        let chapters: AddByRSSChapterResponse[] = [];
        let transcriptText: string | undefined;

        if (chaptersFeedUrlTrimmed) {
          const response = await _request<{ chapters?: PIChapter[] }>(chaptersFeedUrlTrimmed);
          const data = response.data;
          if (data?.chapters && Array.isArray(data.chapters)) {
            const createChapters = compatParsedChapters(data.chapters);
            const withEndTimes = assignChapterEndTimes(createChapters);
            chapters = withEndTimes.map((ch, i) => ({
              ...ch,
              id_text: `${itemIdText}-ch-${i}`,
            }));
          }
        }

        if (transcriptUrlTrimmed) {
          const transcriptResponse = await _request<unknown>(transcriptUrlTrimmed);
          transcriptText = normalizeTranscriptResponseData(transcriptResponse.data);
        }

        res.json({ chapters, transcriptText });
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }
}

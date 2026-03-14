import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { _request } from '@api/lib/_request.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { assignChapterEndTimes } from '@api/lib/chapters.js';
import { normalizeTranscriptResponseData } from '@api/lib/transcript.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { AddByRSSChapterResponse } from '@podverse/helpers-requests';
import { AccountFollowingAddByRSSChannelService } from '@podverse/orm';
import type { PIChapter } from '@podverse/parser-mapping';
import { compatParsedChapters } from '@podverse/parser-mapping';

const bodySchema = Joi.object({
  itemIdText: Joi.string().required(),
  chaptersFeedUrl: Joi.string().uri().optional().allow(''),
  transcriptUrl: Joi.string().uri().optional().allow(''),
  feedUrl: Joi.string().uri().optional().allow(''),
});

export class AccountAddByRSSChaptersTranscriptController {
  /**
   * On-demand chapters and transcript for add-by-RSS.
   * Client sends URLs from the bundle (chaptersFeedUrl, transcriptUrl); backend fetches and parses
   * server-side (avoids CORS). When feedUrl is provided and the user is authenticated, uses stored
   * Basic Auth for that feed when fetching (if credentials exist).
   *
   * Product/QA: For feeds that require Basic Auth, chapters and transcript will only succeed if
   * (1) the user is logged in and (2) the client sends feedUrl in the request body so the backend
   * can look up stored credentials. If feedUrl is omitted, no Basic Auth is applied.
   */
  static async getChaptersAndTranscript(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      () => {
        validateBodyObject(bodySchema, req, res, async () => {
          const { itemIdText, chaptersFeedUrl, transcriptUrl, feedUrl } = req.body as {
            itemIdText: string;
            chaptersFeedUrl?: string;
            transcriptUrl?: string;
            feedUrl?: string;
          };

          const chaptersFeedUrlTrimmed =
            typeof chaptersFeedUrl === 'string' && chaptersFeedUrl.trim() !== ''
              ? chaptersFeedUrl.trim()
              : undefined;
          const transcriptUrlTrimmed =
            typeof transcriptUrl === 'string' && transcriptUrl.trim() !== ''
              ? transcriptUrl.trim()
              : undefined;
          const feedUrlTrimmed =
            typeof feedUrl === 'string' && feedUrl.trim() !== '' ? feedUrl.trim() : undefined;

          if (!chaptersFeedUrlTrimmed && !transcriptUrlTrimmed) {
            res.status(400).json({
              message: 'At least one of chaptersFeedUrl or transcriptUrl is required',
            });
            return;
          }

          try {
            let authHeaders: Record<string, string> | undefined;
            if (feedUrlTrimmed) {
              const account = getAuthenticatedUser(req);
              const channelService = new AccountFollowingAddByRSSChannelService();
              const credentials = await channelService.getCredentialsForFeed(
                account.id,
                feedUrlTrimmed
              );
              if (credentials) {
                const encoded = Buffer.from(
                  `${credentials.username}:${credentials.password}`,
                  'utf8'
                ).toString('base64');
                authHeaders = { Authorization: `Basic ${encoded}` };
              }
            }

            let chapters: AddByRSSChapterResponse[] = [];
            let transcriptText: string | undefined;

            if (chaptersFeedUrlTrimmed) {
              const response = await _request<{ chapters?: PIChapter[] }>(chaptersFeedUrlTrimmed, {
                headers: authHeaders,
              });
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
              const transcriptResponse = await _request<unknown>(transcriptUrlTrimmed, {
                headers: authHeaders,
              });
              transcriptText = normalizeTranscriptResponseData(transcriptResponse.data);
            }

            res.json({ chapters, transcriptText });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }
}

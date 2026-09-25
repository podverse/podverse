import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { loggerService } from '@api/factories/loggerService.js';
import { _request } from '@api/lib/_request.js';
import { joiAddByRssCredentialField } from '@api/lib/addByRSSCredentials.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { assignChapterEndTimes } from '@api/lib/chapters.js';
import { normalizeTranscriptResponseData } from '@api/lib/transcript.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { resolveCredentialScope } from '@podverse/helpers';
import type { AddByRssCredentialSecrets } from '@podverse/helpers-backend';
import type { AddByRSSChapterResponse, AxiosRequestConfig } from '@podverse/helpers-requests';
import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation';
import { buildCredentialScopedBeforeRedirect } from '@podverse/parser';
import type { PIChapter } from '@podverse/parser-mapping';
import { compatParsedChapters } from '@podverse/parser-mapping';

const bodySchema = Joi.object({
  itemIdText: Joi.string().required(),
  chaptersFeedUrl: Joi.string().uri().optional().allow(''),
  transcriptUrl: Joi.string().uri().optional().allow(''),
  feedUrl: Joi.string().uri().optional().allow(''),
  basic_auth_username: joiAddByRssCredentialField().optional(),
  basic_auth_password: joiAddByRssCredentialField().optional(),
}).and('basic_auth_username', 'basic_auth_password');

type ResourceKind = 'chapters' | 'transcript';

const hostForLog = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
};

/**
 * Request options for one chapters or transcript fetch. Basic Auth rides along only when the
 * resource sits within the feed's credential scope, and redirects re-check that scope per hop.
 */
const buildResourceRequestConfig = (
  kind: ResourceKind,
  resourceUrl: string,
  feed: { feedUrl: string; credentials: AddByRssCredentialSecrets } | null
): AxiosRequestConfig => {
  if (!feed) {
    return {};
  }
  const allowInsecure = config.addByRss.allowInsecureCredentials;
  const decision = resolveCredentialScope(feed.feedUrl, resourceUrl, { allowInsecure });
  if (decision !== 'send') {
    loggerService.info('Add-by-RSS credentials withheld from resource', {
      resource: kind,
      resourceHost: hostForLog(resourceUrl),
      decision,
    });
    return {};
  }
  const encoded = Buffer.from(
    `${feed.credentials.username}:${feed.credentials.password}`,
    'utf8'
  ).toString('base64');
  return {
    headers: { Authorization: `Basic ${encoded}` },
    beforeRedirect: buildCredentialScopedBeforeRedirect({
      feedUrl: feed.feedUrl,
      credentialsAttached: true,
      allowInsecure,
      onCredentialsWithheld: (redirectDecision) => {
        loggerService.info('Add-by-RSS credentials withheld on redirect', {
          resource: kind,
          resourceHost: hostForLog(resourceUrl),
          decision: redirectDecision,
        });
      },
    }),
  };
};

export class AccountAddByRSSChaptersTranscriptController {
  /**
   * On-demand chapters and transcript for add-by-RSS.
   * Client sends URLs from the bundle (chaptersFeedUrl, transcriptUrl); backend fetches and parses
   * server-side (avoids CORS).
   *
   * Private feeds: the device sends `basic_auth_username` / `basic_auth_password` together with
   * `feedUrl`. Credentials are used for this request only and attached to a resource URL only
   * when it is on HTTPS within the feed's registrable domain (`resolveCredentialScope`).
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

          const hasBodyCredentials = req.body.basic_auth_username !== undefined;
          if (hasBodyCredentials && !feedUrlTrimmed) {
            res.status(400).json({ message: 'feedUrl is required when credentials are sent' });
            return;
          }

          const resolvedFeed = feedUrlTrimmed
            ? resolveAddByRSSFeedUrlCredentials(
                feedUrlTrimmed,
                req.body.basic_auth_username,
                req.body.basic_auth_password
              )
            : null;
          const scopedFeed = resolvedFeed?.credentials
            ? { feedUrl: resolvedFeed.feedUrl, credentials: resolvedFeed.credentials }
            : null;

          try {
            let chapters: AddByRSSChapterResponse[] = [];
            let transcriptText: string | undefined;

            if (chaptersFeedUrlTrimmed) {
              const response = await _request<{ chapters?: PIChapter[] }>(
                chaptersFeedUrlTrimmed,
                buildResourceRequestConfig('chapters', chaptersFeedUrlTrimmed, scopedFeed)
              );
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
              const transcriptResponse = await _request<unknown>(
                transcriptUrlTrimmed,
                buildResourceRequestConfig('transcript', transcriptUrlTrimmed, scopedFeed)
              );
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

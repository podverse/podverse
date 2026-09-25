import type { DTOItemChapterCreate } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

/** Chapter shape returned by add-by-RSS chapters-transcript API (no DB id). */
export type AddByRSSChapterResponse = DTOItemChapterCreate & { id_text: string };

export type ReqAccountAddByRSSChaptersTranscriptParams = {
  itemIdText: string;
  chaptersFeedUrl?: string;
  transcriptUrl?: string;
  /** Feed the chapters and transcript belong to; required when credentials are sent. */
  feedUrl?: string;
  /**
   * Device-held Basic Auth for a private feed, sent together or not at all. Used for this
   * request only and attached to a resource only within the feed's credential scope.
   */
  basic_auth_username?: string;
  basic_auth_password?: string;
};

export type ReqAccountAddByRSSChaptersTranscriptResponse = {
  chapters: AddByRSSChapterResponse[];
  transcriptText?: string;
};

export async function reqAccountAddByRSSChaptersTranscript(
  api: ApiRequestService,
  params: ReqAccountAddByRSSChaptersTranscriptParams
) {
  return api.apiRequest<ReqAccountAddByRSSChaptersTranscriptResponse>({
    path: '/account/add-by-rss/chapters-transcript',
    method: 'POST',
    config: {
      withCredentials: true,
    },
    data: params,
  });
}

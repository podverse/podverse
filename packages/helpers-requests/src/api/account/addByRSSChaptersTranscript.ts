import type { ApiRequestService } from '../_request.js';
import type { DTOItemChapterCreate } from '@podverse/helpers';

/** Chapter shape returned by add-by-RSS chapters-transcript API (no DB id). */
export type AddByRSSChapterResponse = DTOItemChapterCreate & { id_text: string };

export type ReqAccountAddByRSSChaptersTranscriptParams = {
  itemIdText: string;
  chaptersFeedUrl?: string;
  transcriptUrl?: string;
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

import type { DTOItemChapter } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqItemChapterGetByIdText(
  api: ApiRequestService,
  item_chapter_id_text: string
) {
  return api.apiRequest<DTOItemChapter>({
    path: `/item-chapter/${item_chapter_id_text}`,
    method: 'GET',
  });
}

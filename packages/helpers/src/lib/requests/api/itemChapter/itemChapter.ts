import { DTOItemChapter } from '../../../../dtos';
import { ApiRequestService } from '../_request';

export async function reqItemChapterGetByIdText(
  api: ApiRequestService,
  item_chapter_id_text: string
) {
  return api.apiRequest<DTOItemChapter>({
    path: `/item-chapter/${item_chapter_id_text}`,
    method: 'GET',
  });
}

import type { DTOItemChapter } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from './types';

/**
 * Segment metadata for the full player. Soundbites are embedded on the item DTO
 * (`item.item_soundbites`), so only chapters need a fetch. Repository-mediated so player components
 * never call `req*` directly (parallels `playbackContentRepository`). Table-of-contents-suppressed
 * chapters (`table_of_contents === false`) are filtered out, matching the episode detail screen.
 */
export const segmentsRepository = {
  getChaptersByItemIdText: async (
    context: MobileAuthRequestContext,
    idText: string
  ): Promise<DTOItemChapter[]> => {
    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqItemParseAndGetChapters(idText)
    );
    return response.data.filter((chapter) => chapter.table_of_contents !== false);
  },
};

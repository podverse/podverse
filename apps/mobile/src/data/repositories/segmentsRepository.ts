import { hasUrlInCredentialScope } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers/dto';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { AddByRssCredentials } from '../../lib/addByRss/credentials';
import { fetchAddByRssItemSectionsOnDevice } from '../../lib/addByRss/deviceItemSections';
import type { AddByRssItemSections } from '../../lib/addByRss/itemSections';
import {
  addByRssItemSectionUrls,
  buildAddByRssItemSectionsRequest,
  toAddByRssItemSections,
} from '../../lib/addByRss/itemSections';
import { addByRssCredentialStore } from './addByRssCredentialStore';
import { addByRssRepository } from './addByRssRepository';
import type { MobileAuthRequestContext } from './types';

/**
 * Segment metadata for the full player and the episode pages. Soundbites are embedded on the
 * item DTO (`item.item_soundbites`), so only chapters need a fetch. Repository-mediated so player
 * components never call `req*` directly (parallels `playbackContentRepository`).
 * Table-of-contents-suppressed chapters (`table_of_contents === false`) are filtered out, matching
 * the episode detail screen.
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

  /**
   * Chapters and transcript for one Add by RSS item, from the URLs its parsed bundle links.
   * Signed in, the API fetches them, whatever the membership; signed out, the phone fetches them
   * from the feed's host. The device's stored feed credentials are read only when one of those
   * URLs is on the feed's credential scope. An item that links neither, or a feed this session
   * hides (the signed-out user's feed while someone is signed in), resolves to empty sections
   * without a request.
   */
  getAddByRssChaptersAndTranscript: async (
    context: MobileAuthRequestContext,
    input: {
      feedUrl: string;
      itemBundle: AddByRSSMappedFeed['items'][number];
      itemIdText: string;
    }
  ): Promise<AddByRssItemSections> => {
    const urls = addByRssItemSectionUrls(input.itemBundle);
    if (urls === null) {
      return { chapters: [], transcriptRows: [] };
    }

    let credentials: AddByRssCredentials | null = null;
    if (hasUrlInCredentialScope(input.feedUrl, [urls.chaptersFeedUrl, urls.transcriptUrl])) {
      try {
        credentials = await addByRssCredentialStore.getForCurrentAccount(input.feedUrl);
      } catch {
        credentials = null;
      }
    }

    if (context.accessToken === null) {
      return fetchAddByRssItemSectionsOnDevice({
        credentials,
        feedUrl: input.feedUrl,
        itemIdText: input.itemIdText,
        urls,
      });
    }

    if (await addByRssRepository.isFeedHiddenInSession(input.feedUrl)) {
      return { chapters: [], transcriptRows: [] };
    }

    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqAccountAddByRSSChaptersTranscript(
        buildAddByRssItemSectionsRequest({
          credentials,
          feedUrl: input.feedUrl,
          itemIdText: input.itemIdText,
          urls,
        })
      )
    );
    return toAddByRssItemSections(response);
  },
};

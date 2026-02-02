import { ItemChapterService, ItemChaptersFeedLogService } from '@podverse/orm';
import type { ItemChapterDto, Item, ItemChaptersFeed } from '@podverse/orm';
import type { PIChapter } from '@parser/lib/compat/chapters/chapters.js';
import { compatParsedChapters } from '@parser/lib/compat/chapters/chapters.js';
import { _request } from '../_request.js';

const getParsedChapters = async (
  item_chapters_feed: ItemChaptersFeed
): Promise<ItemChapterDto[] | null> => {
  const itemChaptersFeedLogService = new ItemChaptersFeedLogService();
  try {
    const response = await _request(item_chapters_feed.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = response.data as any;

    if (data?.chapters) {
      const chapters = data.chapters as PIChapter[];
      await itemChaptersFeedLogService.update(item_chapters_feed, {
        last_http_status: 200,
        last_good_http_status_time: new Date(),
      });
      return compatParsedChapters(chapters);
    } else {
      throw new Error('No chapters found in feed');
    }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const statusCode = (err.response?.status ?? err.statusCode) as number | undefined;
    const item_chapters_feed_log = await itemChaptersFeedLogService.get(item_chapters_feed);
    if (statusCode) {
      await itemChaptersFeedLogService.update(item_chapters_feed, {
        last_http_status: statusCode,
        parse_errors: (item_chapters_feed_log?.parse_errors || 0) + 1,
      });
    }
    return null;
  }
};

export const parseChapters = async (item: Item): Promise<{ parsed: boolean }> => {
  const item_chapters_feed = item.item_chapters_feed;

  if (!item_chapters_feed) {
    return { parsed: false };
  }

  const parsedChapters = await getParsedChapters(item_chapters_feed);

  if (parsedChapters === null) {
    return { parsed: false };
  }

  const itemChapterService = new ItemChapterService();

  const existingChapters = await itemChapterService.getAll(item_chapters_feed, {
    select: ['id', 'data_hash'],
  });
  const existingChaptersDataHashes = existingChapters.map((item_chapter) => item_chapter.data_hash);
  const updatedChaptersDataHashes: string[] = [];

  for (const parsedChapter of parsedChapters) {
    updatedChaptersDataHashes.push(parsedChapter.data_hash);
    if (!existingChaptersDataHashes.includes(parsedChapter.data_hash)) {
      await itemChapterService.update(item_chapters_feed, parsedChapter);
    }
  }

  const dataHashesToDelete = existingChaptersDataHashes.filter(
    (hash) => !updatedChaptersDataHashes.includes(hash)
  );
  if (dataHashesToDelete.length > 0) {
    await itemChapterService.deleteManyByDataHash(item_chapters_feed, dataHashesToDelete);
  }

  const itemChaptersFeedLogService = new ItemChaptersFeedLogService();
  await itemChaptersFeedLogService.update(item_chapters_feed, {
    last_finished_parse_time: new Date(),
  });

  return { parsed: true };
};

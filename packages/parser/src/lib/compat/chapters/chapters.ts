import { getPIChapterMd5Hash } from '@parser/lib/rss/hash/parsedItemChapter';
import { isValidHttpUrl } from '@podverse/helpers';
import { ItemChapterDto } from '@podverse/orm';

export type PIChapter = {
  startTime: string
  endTime: string | null
  title: string | null
  img: string | null
  url: string | null
  toc: boolean
}

export const compatParsedChapters = (chapters: PIChapter[]): ItemChapterDto[] => {
  return chapters.map(chapter => {
    const data_hash = getPIChapterMd5Hash(chapter);
    return {
      start_time: chapter.startTime,
      end_time: chapter.endTime || null,
      title: chapter.title || null,
      img: isValidHttpUrl(chapter.img) && chapter.img || null,
      web_url: isValidHttpUrl(chapter.url) && chapter.url || null,
      table_of_contents: chapter.toc === false ? false : true,
      data_hash,
    };
  });
};

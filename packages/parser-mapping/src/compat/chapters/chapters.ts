import { isValidHttpUrl } from '@podverse/helpers-validation';
import type { DTOItemChapterCreate } from '@podverse/helpers';
import type { PIChapter } from '../../types/partytime.js';
import { getPIChapterMd5Hash } from './hash.js';

export const compatParsedChapters = (chapters: PIChapter[]): DTOItemChapterCreate[] => {
  return chapters.map((chapter) => {
    const data_hash = getPIChapterMd5Hash(chapter);
    return {
      start_time: chapter.startTime,
      end_time: chapter.endTime || null,
      title: chapter.title || null,
      img: (isValidHttpUrl(chapter.img) && chapter.img) || null,
      web_url: (isValidHttpUrl(chapter.url) && chapter.url) || null,
      table_of_contents: chapter.toc === false ? false : true,
      data_hash,
    };
  });
};

import type { DTOItemChapterCreate } from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

import type { PIChapter } from '../../types/partytime.js';
import { getPIChapterMd5Hash } from './hash.js';

function mapChapterLocation(location: PIChapter['location']): DTOItemChapterCreate['location'] {
  if (!location || typeof location !== 'object') {
    return null;
  }
  const hasGeo = typeof location.geo === 'string' && location.geo.length > 0;
  const hasOsm = typeof location.osm === 'string' && location.osm.length > 0;
  if (!hasGeo && !hasOsm) {
    return null;
  }
  const name = typeof location.name === 'string' && location.name.length > 0 ? location.name : null;
  return {
    name,
    geo: hasGeo ? location.geo : null,
    osm: hasOsm ? (location.osm ?? null) : undefined,
  };
}

export const compatParsedChapters = (chapters: PIChapter[]): DTOItemChapterCreate[] => {
  return chapters.map((chapter) => {
    const data_hash = getPIChapterMd5Hash(chapter);
    const location = mapChapterLocation(chapter.location);
    return {
      start_time: chapter.startTime,
      end_time: chapter.endTime || null,
      title: chapter.title || null,
      img: (isValidHttpUrl(chapter.img) && chapter.img) || null,
      web_url: (isValidHttpUrl(chapter.url) && chapter.url) || null,
      table_of_contents: chapter.toc === false ? false : true,
      data_hash,
      ...(location ? { location } : {}),
    };
  });
};

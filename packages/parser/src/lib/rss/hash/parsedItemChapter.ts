import { getMd5Hash } from '@podverse/helpers';
import type { PIChapter } from '@parser/lib/compat/chapters/chapters.js';

function stripUrlParams(url: string | null): string | null {
  if (!url) {
    return url;
  }
  try {
    return new URL(url).origin + new URL(url).pathname;
  } catch {
    return url;
  }
}

export const getPIChapterMd5Hash = (piChapter: PIChapter): string => {
  const { startTime, endTime, title, img, url, toc } = piChapter;

  const imgNoParams = stripUrlParams(img);
  const urlNoParams = stripUrlParams(url);

  const currentItemChapterDataHash = getMd5Hash({
    startTime,
    endTime,
    title,
    img: imgNoParams,
    url: urlNoParams,
    toc,
  });

  return currentItemChapterDataHash;
};

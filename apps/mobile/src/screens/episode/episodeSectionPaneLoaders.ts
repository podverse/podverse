import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers/dto';

import { emptyIfNotFound } from '../../lib/apiErrorStatus';
import { sectionResponseHasMore } from '../podcast/sections/usePodcastSectionRows';

const EMPTY_CLIP_PAGE = {
  data: [] as DTOClip[],
  meta: { count: 0, limit: 0, page: 1 },
};
const EMPTY_SOUNDBITE_PAGE = { data: [] as DTOItemSoundbite[] };
const EMPTY_CHAPTER_PAGE = { data: [] as DTOItemChapter[] };
const EMPTY_TRANSCRIPT = { data: '' };

export type EpisodeClipPageResponse = {
  data: DTOClip[];
  meta: { count: number | null; limit: number; page: number };
};

export const loadEpisodeChaptersPane = async (
  run: () => Promise<{ data: DTOItemChapter[] }>
): Promise<DTOItemChapter[]> => {
  const response = await emptyIfNotFound(run, EMPTY_CHAPTER_PAGE);
  const chapters = Array.isArray(response.data) ? response.data : EMPTY_CHAPTER_PAGE.data;
  return chapters.filter((chapter) => chapter.table_of_contents !== false);
};

export const loadEpisodeSoundbitesPane = async (
  run: () => Promise<{ data: DTOItemSoundbite[] }>
): Promise<DTOItemSoundbite[]> => {
  const response = await emptyIfNotFound(run, EMPTY_SOUNDBITE_PAGE);
  return Array.isArray(response.data) ? response.data : EMPTY_SOUNDBITE_PAGE.data;
};

export const loadEpisodeClipsPane = async (
  run: () => Promise<EpisodeClipPageResponse>,
  page: number
): Promise<{ hasMore: boolean; rows: DTOClip[] }> => {
  const response = await emptyIfNotFound(run, {
    ...EMPTY_CLIP_PAGE,
    meta: { ...EMPTY_CLIP_PAGE.meta, page },
  });
  const rows = Array.isArray(response.data) ? response.data : EMPTY_CLIP_PAGE.data;
  return {
    hasMore: sectionResponseHasMore(response.meta, rows.length),
    rows,
  };
};

export const loadEpisodeTranscriptPane = async (
  run: () => Promise<{ data: string | null }>
): Promise<string> => {
  const response = await emptyIfNotFound(run, EMPTY_TRANSCRIPT);
  return response.data ?? '';
};

import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers';

import { getChapterAtPercent, getChapterBoundaryRatios } from '../chapterProgressMarkers';

const chapters: DTOItemChapter[] = [
  {
    id_text: 'one',
    start_time: '0',
    end_time: '20',
    title: 'Intro',
    table_of_contents: true,
  } as DTOItemChapter,
  {
    id_text: 'two',
    start_time: '20',
    end_time: '40',
    title: 'Topic A',
    table_of_contents: true,
  } as DTOItemChapter,
  {
    id_text: 'three',
    start_time: '40',
    end_time: '60',
    title: 'Outro',
    table_of_contents: true,
  } as DTOItemChapter,
];

describe('getChapterBoundaryRatios', () => {
  it('returns interior boundary ratios for a 60s episode', () => {
    const ratios = getChapterBoundaryRatios(chapters, 60);
    expect(ratios).toEqual([20 / 60, 40 / 60]);
  });
});

describe('getChapterAtPercent', () => {
  it('returns the chapter containing the percent position', () => {
    expect(getChapterAtPercent(0.5, chapters, 60)?.title).toBe('Topic A');
  });
});

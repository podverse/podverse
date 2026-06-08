import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers';

import { resolveEmbedActiveChapterForArtwork } from '../resolveEmbedActiveChapterForArtwork';

const chapters: DTOItemChapter[] = [
  {
    id_text: 'chap-intro',
    start_time: '0',
    end_time: '20',
    title: 'Intro',
    img: 'http://localhost/embed-sample-chapter-intro-art.png',
    table_of_contents: true,
  } as DTOItemChapter,
  {
    id_text: 'chap-topic',
    start_time: '20',
    end_time: '40',
    title: 'Topic A',
    img: 'http://localhost/embed-sample-chapter-topic-a-art.png',
    table_of_contents: true,
  } as DTOItemChapter,
];

describe('resolveEmbedActiveChapterForArtwork', () => {
  it('returns null at playhead 0 when the first chapter starts at 0', () => {
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: false,
        mpItemChapters: chapters,
        mpCurrentTimeSeconds: 0,
        mpItemChapter: null,
      })
    ).toBeNull();
  });

  it('returns the active chapter from the playhead', () => {
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: false,
        mpItemChapters: chapters,
        mpCurrentTimeSeconds: 25,
        mpItemChapter: null,
      })?.img
    ).toContain('chapter-topic-a-art');
  });

  it('returns null when the user prefers the episode title', () => {
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: true,
        mpItemChapters: chapters,
        mpCurrentTimeSeconds: 25,
        mpItemChapter: chapters[1],
      })
    ).toBeNull();
  });

  it('uses the loaded chapter target before chapters are fetched', () => {
    const chapterTarget = chapters[1];
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: false,
        mpItemChapters: null,
        mpCurrentTimeSeconds: 20,
        mpItemChapter: chapterTarget,
      })
    ).toBe(chapterTarget);
  });
});

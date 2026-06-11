import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers';

import { resolveEmbedActiveChapterForArtwork } from '../resolveEmbedActiveChapterForArtwork';

const topicChapter = {
  id_text: 'chap-topic',
  start_time: '20',
  end_time: '40',
  title: 'Topic A',
  img: 'http://localhost:2111/e2e/images/e2e-embed-item-art-1400.png',
  table_of_contents: true,
} as DTOItemChapter;

const chapters: DTOItemChapter[] = [
  {
    id_text: 'chap-intro',
    start_time: '0',
    end_time: '20',
    title: 'Intro',
    img: 'http://localhost:2111/e2e/images/e2e-embed-item-art-1400.png',
    table_of_contents: true,
  } as DTOItemChapter,
  topicChapter,
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
    ).toContain('e2e-embed-item-art');
  });

  it('returns null when the user prefers the episode title', () => {
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: true,
        mpItemChapters: chapters,
        mpCurrentTimeSeconds: 25,
        mpItemChapter: topicChapter,
      })
    ).toBeNull();
  });

  it('uses the loaded chapter target before chapters are fetched', () => {
    expect(
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo: true,
        preferItemTitle: false,
        mpItemChapters: null,
        mpCurrentTimeSeconds: 20,
        mpItemChapter: topicChapter,
      })
    ).toBe(topicChapter);
  });
});

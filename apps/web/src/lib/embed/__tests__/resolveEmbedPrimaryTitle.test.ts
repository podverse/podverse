import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { resolveEmbedPrimaryTitle } from '../resolveEmbedPrimaryTitle';

const item = { title: 'Episode title' } as DTOItem;
const clip = { title: 'Clip title' } as DTOClip;
const soundbite = { title: 'Soundbite title' } as DTOItemSoundbite;

const chapters: DTOItemChapter[] = [
  {
    id_text: 'chap-intro',
    start_time: '0',
    end_time: '20',
    title: 'Intro',
    table_of_contents: true,
  } as DTOItemChapter,
  {
    id_text: 'chap-topic',
    start_time: '20',
    end_time: '40',
    title: 'Topic A',
    table_of_contents: true,
  } as DTOItemChapter,
];

describe('resolveEmbedPrimaryTitle', () => {
  it('prefers clip title without toggle', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: clip,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 25,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Clip title', allowTitleToggle: false, showChapterTitleIcon: false });
  });

  it('prefers soundbite title without toggle', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: null,
        mpItemSoundbite: soundbite,
        mpItemChapters: chapters,
        currentTimeSeconds: 25,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Soundbite title', allowTitleToggle: false, showChapterTitleIcon: false });
  });

  it('uses item title when clip has no title and ignores chapters', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: {} as DTOClip,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 25,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Episode title', allowTitleToggle: false, showChapterTitleIcon: false });
  });

  it('shows item title at playhead 0 when first chapter starts at 0', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 0,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Episode title', allowTitleToggle: true, showChapterTitleIcon: false });
  });

  it('shows active chapter title at playhead by default', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 25,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Topic A', allowTitleToggle: true, showChapterTitleIcon: true });
  });

  it('shows item title when preferItemTitle is true', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 25,
        preferItemTitle: true,
      })
    ).toEqual({ title: 'Episode title', allowTitleToggle: true, showChapterTitleIcon: false });
  });

  it('falls back to item title when playhead is outside chapters', () => {
    expect(
      resolveEmbedPrimaryTitle({
        mpItem: item,
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: chapters,
        currentTimeSeconds: 55,
        preferItemTitle: false,
      })
    ).toEqual({ title: 'Episode title', allowTitleToggle: true, showChapterTitleIcon: false });
  });
});

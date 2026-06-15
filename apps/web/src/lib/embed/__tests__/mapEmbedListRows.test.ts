import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { mapItemChaptersToEmbedListRows, sortEmbedItemChapters } from '../mapEmbedListRows';

const channel = { id_text: 'pod-1', medium_id: MediumEnum.Podcast } as DTOChannel;
const videoChannel = { id_text: 'vid-1', medium_id: MediumEnum.Video } as DTOChannel;
const item = { id_text: 'ep-1', title: 'Episode One' } as DTOItem;

const chapters = [
  { id_text: 'ch-2', title: 'Topic A', start_time: 20 },
  { id_text: 'ch-1', title: 'Intro', start_time: 0 },
  { id_text: 'ch-3', title: 'Outro', start_time: 40 },
] as DTOItemChapter[];

describe('sortEmbedItemChapters', () => {
  it('orders chapters by start_time ascending', () => {
    expect(sortEmbedItemChapters(chapters, 'asc').map((chapter) => chapter.id_text)).toEqual([
      'ch-1',
      'ch-2',
      'ch-3',
    ]);
  });

  it('orders chapters by start_time descending', () => {
    expect(sortEmbedItemChapters(chapters, 'desc').map((chapter) => chapter.id_text)).toEqual([
      'ch-3',
      'ch-2',
      'ch-1',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [...chapters];
    sortEmbedItemChapters(input, 'desc');
    expect(input.map((chapter) => chapter.id_text)).toEqual(['ch-2', 'ch-1', 'ch-3']);
  });
});

describe('mapItemChaptersToEmbedListRows', () => {
  it('builds one chapters group whose rows seek within the parent episode', () => {
    const sorted = sortEmbedItemChapters(chapters, 'asc');
    const groups = mapItemChaptersToEmbedListRows(channel, item, sorted);

    expect(groups).toHaveLength(1);
    expect(groups[0].groupKey).toBe('chapters');

    const rows = groups[0].rows;
    expect(rows.map((row) => row.rowKey)).toEqual(['chapter:ch-1', 'chapter:ch-2', 'chapter:ch-3']);

    const firstRow = rows[0];
    expect(firstRow.playIdText).toBe('ch-1');
    expect(firstRow.listLabel).toBe('Intro');
    expect(firstRow.itemChapter?.id_text).toBe('ch-1');
    expect(firstRow.item).toBe(item);
    expect(firstRow.channel).toBe(channel);
    expect(firstRow.clip).toBeNull();
    expect(firstRow.mediaType).toBe('audio');
  });

  it('uses the channel medium to resolve the row media type', () => {
    const groups = mapItemChaptersToEmbedListRows(videoChannel, item, [chapters[1]]);
    expect(groups[0].rows[0].mediaType).toBe('video');
  });

  it('falls back to a display title when a chapter title is blank', () => {
    const blankTitleChapters = [
      { id_text: 'ch-x', title: '   ', start_time: 0 },
    ] as DTOItemChapter[];
    const groups = mapItemChaptersToEmbedListRows(channel, item, blankTitleChapters);
    expect(groups[0].rows[0].listLabel).not.toBe('');
  });
});

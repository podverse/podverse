import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers/dto';

import { resolveNowPlayingSegment, soundbiteEndTime } from './nowPlayingSegment';

const channel = { id: 1, id_text: 'ch', medium_id: 1, title: 'Channel' } as DTOChannel;
const item = { id: 1, id_text: 'it', title: 'Episode' } as DTOItem;

const chapter = (over: Partial<DTOItemChapter>): DTOItemChapter =>
  ({
    end_time: '60',
    id: 1,
    id_text: 'c1',
    start_time: '0',
    table_of_contents: true,
    title: 'Chapter one',
    ...over,
  }) as DTOItemChapter;

describe('resolveNowPlayingSegment', () => {
  it('has nothing to say when nothing is playing', () => {
    expect(resolveNowPlayingSegment({ chapters: [], positionSeconds: 0, target: null })).toBeNull();
  });

  it('names the clip that is playing', () => {
    const clip = {
      end_time: '40',
      id: 1,
      id_text: 'cl',
      item,
      start_time: '12',
      title: 'Best bit',
    } as DTOClip;
    expect(
      resolveNowPlayingSegment({
        chapters: [],
        positionSeconds: 12,
        target: { channel, clip, item, kind: 'clip' },
      })
    ).toEqual({ endTime: '40', kind: 'clip', startTime: '12', title: 'Best bit' });
  });

  it('names the chapter target when the finger is up', () => {
    const playing = chapter({
      end_time: '30',
      id: 1,
      id_text: 'c1',
      start_time: '0',
      title: 'Intro',
    });
    expect(
      resolveNowPlayingSegment({
        chapters: [
          playing,
          chapter({ end_time: '90', id: 2, id_text: 'c2', start_time: '30', title: 'Interview' }),
        ],
        positionSeconds: 10,
        target: { channel, chapter: playing, item, kind: 'chapter' },
      })
    ).toEqual({ endTime: '30', kind: 'chapter', startTime: '0', title: 'Intro' });
  });

  it('follows a scrub preview even while the engine playhead stays put', () => {
    const chapters = [
      chapter({ end_time: '30', id: 1, id_text: 'c1', start_time: '0', title: 'Intro' }),
      chapter({ end_time: '90', id: 2, id_text: 'c2', start_time: '30', title: 'Interview' }),
    ];
    expect(
      resolveNowPlayingSegment({
        chapters,
        positionSeconds: 10,
        previewPositionSeconds: 45,
        target: { channel, item, kind: 'item-podcast' },
      })
    ).toEqual({ endTime: '90', kind: 'chapter', startTime: '30', title: 'Interview' });
  });

  it('follows a scrub preview while a chapter target is playing', () => {
    const playing = chapter({ end_time: '30', id: 1, id_text: 'c1', start_time: '0', title: 'Intro' });
    const chapters = [
      playing,
      chapter({ end_time: '90', id: 2, id_text: 'c2', start_time: '30', title: 'Interview' }),
    ];
    expect(
      resolveNowPlayingSegment({
        chapters,
        positionSeconds: 10,
        previewPositionSeconds: 45,
        target: { channel, chapter: playing, item, kind: 'chapter' },
      })
    ).toEqual({ endTime: '90', kind: 'chapter', startTime: '30', title: 'Interview' });
  });

  it('follows the chapter list while a plain episode plays', () => {
    const chapters = [
      chapter({ end_time: '30', id: 1, id_text: 'c1', start_time: '0', title: 'Intro' }),
      chapter({ end_time: '90', id: 2, id_text: 'c2', start_time: '30', title: 'Interview' }),
    ];
    expect(
      resolveNowPlayingSegment({
        chapters,
        positionSeconds: 45,
        target: { channel, item, kind: 'item-podcast' },
      })
    ).toEqual({ endTime: '90', kind: 'chapter', startTime: '30', title: 'Interview' });
  });

  it('says nothing between chapters or when the episode has none', () => {
    const chapters = [chapter({ end_time: '30', start_time: '0', title: 'Intro' })];
    expect(
      resolveNowPlayingSegment({
        chapters,
        positionSeconds: 45,
        target: { channel, item, kind: 'item-podcast' },
      })
    ).toBeNull();
    expect(
      resolveNowPlayingSegment({
        chapters: [],
        positionSeconds: 45,
        target: { channel, item, kind: 'item-podcast' },
      })
    ).toBeNull();
  });

  it('names an official clip with start plus duration as the end', () => {
    const soundbite = {
      duration: '20',
      id: 1,
      id_text: 'sb',
      item,
      item_id: 1,
      start_time: '30',
      title: 'Host reads the ads',
    } as DTOItemSoundbite;
    expect(
      resolveNowPlayingSegment({
        chapters: [],
        positionSeconds: 35,
        target: { channel, item, kind: 'soundbite', soundbite },
      })
    ).toEqual({
      endTime: '50',
      kind: 'official-clip',
      startTime: '30',
      title: 'Host reads the ads',
    });
  });

  it('skips an untitled chapter rather than showing an empty bar', () => {
    const chapters = [chapter({ end_time: '30', start_time: '0', title: '' })];
    expect(
      resolveNowPlayingSegment({
        chapters,
        positionSeconds: 10,
        target: { channel, item, kind: 'item-podcast' },
      })
    ).toBeNull();
  });
});

describe('soundbiteEndTime', () => {
  it('adds duration to start', () => {
    expect(soundbiteEndTime('30', '20')).toBe('50');
  });

  it('returns nothing when either value is not a number', () => {
    expect(soundbiteEndTime('30', 'nope')).toBeNull();
  });
});

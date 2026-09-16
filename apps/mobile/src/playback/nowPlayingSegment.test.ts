import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOClip, DTOItem, DTOItemChapter } from '@podverse/helpers/dto';

import { resolveNowPlayingSegment } from './nowPlayingSegment';

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
    const clip = { id: 1, id_text: 'cl', item, title: 'Best bit' } as DTOClip;
    expect(
      resolveNowPlayingSegment({
        chapters: [],
        positionSeconds: 12,
        target: { channel, clip, item, kind: 'clip' },
      })
    ).toEqual({ kind: 'clip', title: 'Best bit' });
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
    ).toEqual({ kind: 'chapter', title: 'Interview' });
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

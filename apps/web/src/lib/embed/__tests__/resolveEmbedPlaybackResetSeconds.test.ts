import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

import type { PlaybackTarget } from '../../playback';
import {
  resolveEmbedPlaybackPauseAtSeconds,
  resolveEmbedPlaybackResetSeconds,
} from '../resolveEmbedPlaybackResetSeconds';

const clip = {
  id_text: 'clip-1',
  start_time: '12',
  end_time: '42',
} as unknown as DTOClip;

const soundbite = {
  id_text: 'sb-1',
  start_time: '30',
  duration: '15',
} as unknown as DTOItemSoundbite;

const chapter = {
  id_text: 'ch-1',
  start_time: '20',
  end_time: '50',
} as unknown as DTOItemChapter;

const item = { id_text: 'item-1' } as unknown as DTOItem;
const channel = { id_text: 'channel-1' } as unknown as DTOChannel;

const chapterTarget = {
  kind: 'chapter',
  chapter,
  item,
  channel,
} as PlaybackTarget;

const podcastTarget = {
  kind: 'item-podcast',
  item,
  channel,
} as PlaybackTarget;

const musicTarget = {
  kind: 'item-music',
  item,
  channel,
  intent: 'explicit_play',
} as PlaybackTarget;

describe('resolveEmbedPlaybackResetSeconds', () => {
  it('returns chapter start for chapter playback targets', () => {
    expect(
      resolveEmbedPlaybackResetSeconds({
        activePlaybackTarget: chapterTarget,
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(20);
  });

  it('returns 0 for clip, soundbite, episode, and track playback targets', () => {
    expect(
      resolveEmbedPlaybackResetSeconds({
        activePlaybackTarget: null,
        mpClip: clip,
        mpItemSoundbite: null,
      })
    ).toBe(0);

    expect(
      resolveEmbedPlaybackResetSeconds({
        activePlaybackTarget: null,
        mpClip: null,
        mpItemSoundbite: soundbite,
      })
    ).toBe(0);

    expect(
      resolveEmbedPlaybackResetSeconds({
        activePlaybackTarget: podcastTarget,
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(0);
  });
});

describe('resolveEmbedPlaybackPauseAtSeconds', () => {
  it('returns chapter end boundary for chapter playback targets', () => {
    expect(
      resolveEmbedPlaybackPauseAtSeconds({
        activePlaybackTarget: chapterTarget,
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(51);
  });

  it('returns null for clip, soundbite, and full-item playback targets', () => {
    expect(
      resolveEmbedPlaybackPauseAtSeconds({
        activePlaybackTarget: null,
        mpClip: clip,
        mpItemSoundbite: null,
      })
    ).toBeNull();

    expect(
      resolveEmbedPlaybackPauseAtSeconds({
        activePlaybackTarget: null,
        mpClip: null,
        mpItemSoundbite: soundbite,
      })
    ).toBeNull();

    expect(
      resolveEmbedPlaybackPauseAtSeconds({
        activePlaybackTarget: musicTarget,
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBeNull();
  });
});

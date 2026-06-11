import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { getEmbedShareActions } from '../getEmbedShareActions';

const podcastChannel = {
  id_text: 'podcast-channel',
  medium_id: MediumEnum.Podcast,
} as DTOChannel;

const musicChannel = {
  id_text: 'album-channel',
  medium_id: MediumEnum.Music,
} as DTOChannel;

const episodeItem = {
  id_text: 'episode-item',
} as DTOItem;

const trackItem = {
  id_text: 'track-item',
} as DTOItem;

const clip = {
  id_text: 'clip-item',
} as DTOClip;

const itemChapter = {
  id_text: 'chapter-item',
} as DTOItemChapter;

const itemSoundbite = {
  id_text: 'soundbite-item',
} as DTOItemSoundbite;

describe('getEmbedShareActions', () => {
  it('includes track and album actions for music single-item share context', () => {
    const actions = getEmbedShareActions({
      channel: musicChannel,
      item: trackItem,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(actions.map((action) => action.testId)).toEqual([
      'share-embed-album',
      'share-embed-track',
    ]);
    expect(actions.find((action) => action.testId === 'share-embed-track')?.href).toContain(
      'medium_id=3'
    );
    expect(actions.find((action) => action.testId === 'share-embed-track')?.href).toContain(
      '/embed/builder?'
    );
  });

  it('includes clip embed action when clip id_text is present', () => {
    const actions = getEmbedShareActions({
      channel: podcastChannel,
      item: episodeItem,
      clip,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(actions.map((action) => action.testId)).toEqual([
      'share-embed-podcast',
      'share-embed-clip',
    ]);
    expect(actions.find((action) => action.testId === 'share-embed-clip')?.href).toContain(
      'clip=clip-item'
    );
  });

  it('includes chapter embed action when item_chapter id_text is present', () => {
    const actions = getEmbedShareActions({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: itemChapter,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(actions.map((action) => action.testId)).toEqual([
      'share-embed-podcast',
      'share-embed-chapter',
    ]);
  });

  it('includes official clip embed action when item_soundbite id_text is present', () => {
    const actions = getEmbedShareActions({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: null,
      item_soundbite: itemSoundbite,
      playlist: null,
      playlist_item: null,
    });

    expect(actions.map((action) => action.testId)).toEqual([
      'share-embed-podcast',
      'share-embed-official-clip',
    ]);
  });
});

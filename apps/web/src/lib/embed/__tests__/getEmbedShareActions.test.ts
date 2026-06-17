import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaylist,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { getEmbedShareAction } from '../getEmbedShareActions';

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

const playlist = {
  id_text: 'playlist-id',
} as DTOPlaylist;

describe('getEmbedShareAction', () => {
  it('returns podcast list embed for channel-only podcast share context', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: null,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.testId).toBe('share-embed-builder');
    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('list=1');
    expect(action?.href).toContain('channel=podcast-channel');
    expect(action?.href).not.toContain('item=');
  });

  it('returns episode embed for episode share context (not podcast list)', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('item=episode-item');
    expect(action?.href).not.toContain('list=1');
  });

  it('returns track embed for music single-item share context', () => {
    const action = getEmbedShareAction({
      channel: musicChannel,
      item: trackItem,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('item=track-item');
    expect(action?.href).toContain('medium_id=3');
  });

  it('returns album list embed for music channel-only share context', () => {
    const action = getEmbedShareAction({
      channel: musicChannel,
      item: null,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('list=1');
    expect(action?.href).toContain('channel=album-channel');
    expect(action?.href).not.toContain('item=');
  });

  it('returns playlist list embed for playlist-only share context', () => {
    const action = getEmbedShareAction({
      channel: null,
      item: null,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist,
      playlist_item: null,
    });

    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('list=1');
    expect(action?.href).toContain('playlist=playlist-id');
    expect(action?.href).not.toContain('playlist_item=');
  });

  it('returns playlist embed with playlist_item when sharing a playlist row', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist,
      playlist_item: 'episode-item',
    });

    expect(action?.href).toContain('type=compact');
    expect(action?.href).toContain('list=1');
    expect(action?.href).toContain('playlist=playlist-id');
    expect(action?.href).toContain('playlist_item=episode-item');
    expect(action?.href).not.toMatch(/[?&]item=episode-item/);
  });

  it('returns clip embed when clip id_text is present', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: episodeItem,
      clip,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('clip=clip-item');
    expect(action?.href).toContain('type=compact');
  });

  it('returns chapter embed when item_chapter id_text is present', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: itemChapter,
      item_soundbite: null,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('chapter=chapter-item');
  });

  it('returns official clip embed when item_soundbite id_text is present', () => {
    const action = getEmbedShareAction({
      channel: podcastChannel,
      item: episodeItem,
      clip: null,
      item_chapter: null,
      item_soundbite: itemSoundbite,
      playlist: null,
      playlist_item: null,
    });

    expect(action?.href).toContain('official_clip=soundbite-item');
  });

  it('returns null when no embeddable context is present', () => {
    expect(
      getEmbedShareAction({
        channel: null,
        item: null,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
        playlist_item: null,
      })
    ).toBeNull();
  });
});

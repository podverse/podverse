import { describe, expect, it } from 'vitest';

import type { DTOPlaylistResource } from '@podverse/helpers/dto';

import { safeJsonParse } from '../../data/db/serialization';
import { resolvePlaylistDrop } from './resolvePlaylistDrop';

const toPlaylistResource = (value: unknown): DTOPlaylistResource => {
  const parsed = safeJsonParse<DTOPlaylistResource>(JSON.stringify(value));
  if (parsed === null) {
    throw new Error('Failed to build playlist resource fixture');
  }
  return parsed;
};

const buildItem = (idText: string): Record<string, unknown> => ({
  channel: { channel_images: [], medium_id: 2, title: 'Playlist channel' },
  id_text: idText,
  item_about: { duration: '120' },
  item_images: [],
  pub_date: '2026-01-01T00:00:00.000Z',
  title: `Title ${idText}`,
});

const buildResource = (
  id: number,
  listPosition: string,
  kind: 'add_by_rss' | 'clip' | 'item' | 'soundbite'
): DTOPlaylistResource => {
  if (kind === 'item') {
    return toPlaylistResource({
      clip_id: null,
      id,
      item: buildItem(`item-${id}`),
      item_id: id,
      item_soundbite_id: null,
      list_position: listPosition,
      playlist_id: 1,
    });
  }

  if (kind === 'clip') {
    return toPlaylistResource({
      clip: {
        id_text: `clip-${id}`,
        item: buildItem(`clip-item-${id}`),
        title: `Clip ${id}`,
      },
      clip_id: id,
      id,
      item: null,
      item_id: null,
      item_soundbite_id: null,
      list_position: listPosition,
      playlist_id: 1,
    });
  }

  if (kind === 'soundbite') {
    return toPlaylistResource({
      clip_id: null,
      id,
      item: null,
      item_id: null,
      item_soundbite: {
        id_text: `soundbite-${id}`,
        item: buildItem(`soundbite-item-${id}`),
        title: `Soundbite ${id}`,
      },
      item_soundbite_id: id,
      list_position: listPosition,
      playlist_id: 1,
    });
  }

  return toPlaylistResource({
    add_by_rss_hash_id: `rss-${id}`,
    add_by_rss_resource_data: {
      channel_id_text: 'channel-rss',
      channel_title: 'RSS channel',
      feed_url: `https://example.com/${id}.xml`,
      guid: `guid-${id}`,
      id_text: `rss-item-${id}`,
      title: `RSS item ${id}`,
    },
    clip_id: null,
    id,
    item: null,
    item_id: null,
    item_soundbite_id: null,
    list_position: listPosition,
    playlist_id: 1,
  });
};

describe('resolvePlaylistDrop', () => {
  it('returns no-op when fromIndex equals toIndex', () => {
    const resources = [buildResource(1, '1', 'item'), buildResource(2, '2', 'item')];
    const result = resolvePlaylistDrop(resources, 1, 1);

    expect(result.kind).toBe('none');
    expect(result.reordered.map((resource) => resource.id)).toEqual([1, 2]);
  });

  it('resolves first-index drop to addFirst', () => {
    const resources = [
      buildResource(1, '10', 'item'),
      buildResource(2, '20', 'clip'),
      buildResource(3, '30', 'soundbite'),
    ];
    const result = resolvePlaylistDrop(resources, 2, 0);

    expect(result.kind).toBe('apply');
    if (result.kind !== 'apply') {
      return;
    }
    expect(result.reordered.map((resource) => resource.id)).toEqual([3, 1, 2]);
    expect(result.mutation).toMatchObject({
      movedResourceId: 3,
      target: { idText: 'soundbite-3', kind: 'soundbite' },
      type: 'addFirst',
    });
  });

  it('resolves last-index drop to addLast', () => {
    const resources = [
      buildResource(1, '10', 'item'),
      buildResource(2, '20', 'clip'),
      buildResource(3, '30', 'item'),
    ];
    const result = resolvePlaylistDrop(resources, 0, 2);

    expect(result.kind).toBe('apply');
    if (result.kind !== 'apply') {
      return;
    }
    expect(result.reordered.map((resource) => resource.id)).toEqual([2, 3, 1]);
    expect(result.mutation).toMatchObject({
      movedResourceId: 1,
      target: { idText: 'item-1', kind: 'item' },
      type: 'addLast',
    });
  });

  it('resolves middle-index drop to addBetween using reordered neighbors', () => {
    const resources = [
      buildResource(1, '10', 'item'),
      buildResource(2, '20', 'clip'),
      buildResource(3, '30', 'soundbite'),
      buildResource(4, '40', 'item'),
    ];
    const result = resolvePlaylistDrop(resources, 0, 2);

    expect(result.kind).toBe('apply');
    if (result.kind !== 'apply') {
      return;
    }

    expect(result.reordered.map((resource) => resource.id)).toEqual([2, 3, 1, 4]);
    expect(result.mutation).toMatchObject({
      movedResourceId: 1,
      position1: 30,
      position2: 40,
      target: { idText: 'item-1', kind: 'item' },
      type: 'addBetween',
    });
  });

  it('resolves add-by-RSS rows with addFirst/addLast and resource data target', () => {
    const resources = [buildResource(1, '10', 'item'), buildResource(2, '20', 'add_by_rss')];

    const toTop = resolvePlaylistDrop(resources, 1, 0);
    expect(toTop.kind).toBe('apply');
    if (toTop.kind !== 'apply') {
      return;
    }
    expect(toTop.mutation).toMatchObject({
      movedResourceId: 2,
      target: { kind: 'add_by_rss' },
      type: 'addFirst',
    });

    const toBottom = resolvePlaylistDrop(resources, 0, 1);
    expect(toBottom.kind).toBe('apply');
    if (toBottom.kind !== 'apply') {
      return;
    }
    expect(toBottom.mutation.type).toBe('addLast');
    expect(toBottom.mutation.target).toMatchObject({
      idText: 'item-1',
      kind: 'item',
    });
  });

  it('handles single-item and two-item lists without addBetween', () => {
    const single = [buildResource(1, '1', 'item')];
    expect(resolvePlaylistDrop(single, 0, 0).kind).toBe('none');

    const two = [buildResource(1, '10', 'item'), buildResource(2, '20', 'clip')];
    const up = resolvePlaylistDrop(two, 1, 0);
    expect(up.kind).toBe('apply');
    if (up.kind === 'apply') {
      expect(up.mutation.type).toBe('addFirst');
    }

    const down = resolvePlaylistDrop(two, 0, 1);
    expect(down.kind).toBe('apply');
    if (down.kind === 'apply') {
      expect(down.mutation.type).toBe('addLast');
    }
  });

  it('returns no-op for invalid indexes or rows without a target', () => {
    const resources = [buildResource(1, '10', 'item'), buildResource(2, '20', 'clip')];

    expect(resolvePlaylistDrop(resources, -1, 1).kind).toBe('none');
    expect(resolvePlaylistDrop(resources, 0, 5).kind).toBe('none');

    const nonPlayable = [
      toPlaylistResource({
        clip_id: null,
        id: 4,
        item: null,
        item_id: null,
        item_soundbite_id: null,
        list_position: '30',
        playlist_id: 1,
      }),
      buildResource(5, '40', 'item'),
    ];
    expect(resolvePlaylistDrop(nonPlayable, 0, 1).kind).toBe('none');
  });
});

import { describe, expect, it } from 'vitest';

import type { DTOQueueResource } from '@podverse/helpers/dto';

import { safeJsonParse } from '../../data/db/serialization';
import { resolveQueueDrop } from './resolveQueueDrop';

const toQueueResource = (value: unknown): DTOQueueResource => {
  const parsed = safeJsonParse<DTOQueueResource>(JSON.stringify(value));
  if (parsed === null) {
    throw new Error('Failed to build queue resource fixture');
  }
  return parsed;
};

const buildItem = (idText: string): Record<string, unknown> => ({
  channel: { channel_images: [], medium_id: 2, title: 'Queue channel' },
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
): DTOQueueResource => {
  if (kind === 'item') {
    return toQueueResource({
      clip_id: null,
      completed: false,
      id,
      item: buildItem(`item-${id}`),
      item_id: id,
      item_soundbite_id: null,
      list_position: listPosition,
      media_file_duration: '120',
      playback_position: '0',
      playlist_id: 1,
    });
  }

  if (kind === 'clip') {
    return toQueueResource({
      clip: {
        id_text: `clip-${id}`,
        item: buildItem(`clip-item-${id}`),
        title: `Clip ${id}`,
      },
      clip_id: id,
      completed: false,
      id,
      item: null,
      item_id: null,
      item_soundbite_id: null,
      list_position: listPosition,
      media_file_duration: '120',
      playback_position: '0',
      playlist_id: 1,
    });
  }

  if (kind === 'soundbite') {
    return toQueueResource({
      clip_id: null,
      completed: false,
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
      media_file_duration: '120',
      playback_position: '0',
      playlist_id: 1,
    });
  }

  return toQueueResource({
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
    completed: false,
    id,
    item: null,
    item_id: null,
    item_soundbite_id: null,
    list_position: listPosition,
    media_file_duration: '120',
    playback_position: '0',
    playlist_id: 1,
  });
};

describe('resolveQueueDrop', () => {
  it('returns no-op when fromIndex equals toIndex', () => {
    const resources = [buildResource(1, '1', 'item'), buildResource(2, '2', 'item')];
    const result = resolveQueueDrop(resources, 1, 1);

    expect(result.kind).toBe('none');
    expect(result.reordered.map((resource) => resource.id)).toEqual([1, 2]);
  });

  it('resolves first-index drop to addNext', () => {
    const resources = [
      buildResource(1, '1', 'item'),
      buildResource(2, '2', 'clip'),
      buildResource(3, '3', 'soundbite'),
    ];
    const result = resolveQueueDrop(resources, 2, 0);

    expect(result.kind).toBe('apply');
    if (result.kind !== 'apply') {
      return;
    }
    expect(result.reordered.map((resource) => resource.id)).toEqual([3, 1, 2]);
    expect(result.mutation).toMatchObject({
      movedResourceId: 3,
      target: { idText: 'soundbite-3', kind: 'soundbite' },
      type: 'addNext',
    });
  });

  it('resolves last-index drop to addLast', () => {
    const resources = [
      buildResource(1, '10', 'item'),
      buildResource(2, '20', 'clip'),
      buildResource(3, '30', 'item'),
    ];
    const result = resolveQueueDrop(resources, 0, 2);

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
    const result = resolveQueueDrop(resources, 0, 2);

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

  it('resolves add-by-RSS rows by type with addLast at the end', () => {
    const resources = [buildResource(1, '5', 'item'), buildResource(2, '15', 'add_by_rss')];
    const result = resolveQueueDrop(resources, 1, 1);

    expect(result.kind).toBe('none');

    const moveResult = resolveQueueDrop(resources, 0, 1);
    expect(moveResult.kind).toBe('apply');
    if (moveResult.kind !== 'apply') {
      return;
    }

    expect(moveResult.mutation.type).toBe('addLast');
    expect(moveResult.mutation.target.kind).toBe('item');

    const rssMove = resolveQueueDrop(resources, 1, 0);
    expect(rssMove.kind).toBe('apply');
    if (rssMove.kind !== 'apply') {
      return;
    }
    expect(rssMove.mutation).toMatchObject({
      movedResourceId: 2,
      target: { kind: 'add_by_rss' },
      type: 'addNext',
    });
  });

  it('handles single-item and two-item lists without addBetween', () => {
    const single = [buildResource(1, '1', 'item')];
    expect(resolveQueueDrop(single, 0, 0).kind).toBe('none');

    const two = [buildResource(1, '10', 'item'), buildResource(2, '20', 'clip')];
    const up = resolveQueueDrop(two, 1, 0);
    expect(up.kind).toBe('apply');
    if (up.kind === 'apply') {
      expect(up.mutation.type).toBe('addNext');
    }

    const down = resolveQueueDrop(two, 0, 1);
    expect(down.kind).toBe('apply');
    if (down.kind === 'apply') {
      expect(down.mutation.type).toBe('addLast');
    }
  });
});

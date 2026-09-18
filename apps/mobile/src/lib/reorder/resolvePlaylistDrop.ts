import type { AddByRSSResourceData } from '@podverse/helpers';
import type { DTOPlaylistResource } from '@podverse/helpers/dto';

import { moveItem } from './moveItem';

type PlaylistReorderTarget =
  | { idText: string; kind: 'clip' | 'item' | 'soundbite' }
  | { kind: 'add_by_rss'; resourceData: AddByRSSResourceData };

export type PlaylistReorderMutation =
  | {
      movedResourceId: number;
      target: PlaylistReorderTarget;
      type: 'addFirst' | 'addLast';
    }
  | {
      movedResourceId: number;
      position1: number;
      position2: number;
      target: PlaylistReorderTarget;
      type: 'addBetween';
    };

export type PlaylistDropResolution =
  | { kind: 'apply'; mutation: PlaylistReorderMutation; reordered: DTOPlaylistResource[] }
  | { kind: 'none'; reordered: DTOPlaylistResource[] };

const parseListPosition = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isAddByRssResourceData = (value: unknown): value is AddByRSSResourceData => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const resolvePlaylistReorderTarget = (
  resource: DTOPlaylistResource
): PlaylistReorderTarget | null => {
  if (isAddByRssResourceData(resource.add_by_rss_resource_data)) {
    return { kind: 'add_by_rss', resourceData: resource.add_by_rss_resource_data };
  }
  if (resource.clip !== null && resource.clip !== undefined) {
    return { idText: resource.clip.id_text, kind: 'clip' };
  }
  if (resource.item_soundbite !== null && resource.item_soundbite !== undefined) {
    return { idText: resource.item_soundbite.id_text, kind: 'soundbite' };
  }
  if (resource.item !== null && resource.item !== undefined) {
    return { idText: resource.item.id_text, kind: 'item' };
  }

  return null;
};

export const resolvePlaylistDrop = (
  resources: readonly DTOPlaylistResource[],
  fromIndex: number,
  toIndex: number
): PlaylistDropResolution => {
  const reordered = moveItem(resources, fromIndex, toIndex);
  if (
    fromIndex < 0 ||
    fromIndex >= resources.length ||
    toIndex < 0 ||
    toIndex >= resources.length ||
    fromIndex === toIndex
  ) {
    return { kind: 'none', reordered };
  }

  const moved = resources[fromIndex];
  if (moved === undefined) {
    return { kind: 'none', reordered };
  }

  const target = resolvePlaylistReorderTarget(moved);
  if (target === null) {
    return { kind: 'none', reordered };
  }

  if (toIndex === 0) {
    return {
      kind: 'apply',
      mutation: { movedResourceId: moved.id, target, type: 'addFirst' },
      reordered,
    };
  }

  if (toIndex === reordered.length - 1) {
    return {
      kind: 'apply',
      mutation: { movedResourceId: moved.id, target, type: 'addLast' },
      reordered,
    };
  }

  const previous = reordered[toIndex - 1];
  const next = reordered[toIndex + 1];
  if (previous === undefined || next === undefined) {
    return { kind: 'none', reordered };
  }

  const position1 = parseListPosition(previous.list_position);
  const position2 = parseListPosition(next.list_position);
  if (position1 === null || position2 === null) {
    return { kind: 'none', reordered };
  }

  return {
    kind: 'apply',
    mutation: {
      movedResourceId: moved.id,
      position1,
      position2,
      target,
      type: 'addBetween',
    },
    reordered,
  };
};

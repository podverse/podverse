import type { DTOQueueResource } from '@podverse/helpers/dto';

import { moveItem } from './moveItem';

type QueueReorderTarget =
  | { idText: string; kind: 'clip' | 'item' | 'soundbite' }
  | { kind: 'add_by_rss'; resourceData: object };

export type QueueReorderMutation =
  | {
      movedResourceId: number;
      target: QueueReorderTarget;
      type: 'addLast' | 'addNext';
    }
  | {
      movedResourceId: number;
      position1: number;
      position2: number;
      target: QueueReorderTarget;
      type: 'addBetween';
    };

export type QueueDropResolution =
  | { kind: 'apply'; mutation: QueueReorderMutation; reordered: DTOQueueResource[] }
  | { kind: 'none'; reordered: DTOQueueResource[] };

const parseListPosition = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveQueueReorderTarget = (resource: DTOQueueResource): QueueReorderTarget | null => {
  if (
    resource.add_by_rss_resource_data !== null &&
    resource.add_by_rss_resource_data !== undefined &&
    typeof resource.add_by_rss_resource_data === 'object' &&
    !Array.isArray(resource.add_by_rss_resource_data)
  ) {
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

export const resolveQueueDrop = (
  resources: readonly DTOQueueResource[],
  fromIndex: number,
  toIndex: number
): QueueDropResolution => {
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

  const target = resolveQueueReorderTarget(moved);
  if (target === null) {
    return { kind: 'none', reordered };
  }

  if (toIndex === 0) {
    return {
      kind: 'apply',
      mutation: { movedResourceId: moved.id, target, type: 'addNext' },
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

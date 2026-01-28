import { DTOQueueResourceAbridgedResponseData, QueueResourcesAbridgedIndex } from '../../dtos';

export const generateQueueResourceAbridgedIndex = (
  queueResourcesAbridged: DTOQueueResourceAbridgedResponseData[]
) => {
  const index: QueueResourcesAbridgedIndex = {
    items: {},
    clips: {},
    item_soundbites: {},
    add_by_rss_resource_datas: {},
  };

  queueResourcesAbridged.forEach((resource) => {
    if (resource.c) {
      index.clips[resource.c] = resource;
    } else if (resource.s) {
      index.item_soundbites[resource.s] = resource;
    } else if (resource.a) {
      index.add_by_rss_resource_datas[resource.a] = resource;
    } else if (resource.t) {
      index.items[resource.t] = resource;
    }
  });

  return index;
};

type QueueResourceAbridgedUpdate = {
  i: number;
  p: string; // playback_position
  d: string; // media_file_duration
  z: boolean; // completed
};

type QueueResourceAbridgedUpdateRSS = {
  a: string; // add_by_rss_hash_id
  p: string; // playback_position
  d: string; // media_file_duration
  z: boolean; // completed
};

export type QueueResourceAbridgedUpdates = {
  item: QueueResourceAbridgedUpdate | null;
  clip: QueueResourceAbridgedUpdate | null;
  item_soundbite: QueueResourceAbridgedUpdate | null;
  add_by_rss_resource_data: QueueResourceAbridgedUpdateRSS | null;
};

export const updateQueueResourceAbridgedIndex = (
  index: QueueResourcesAbridgedIndex,
  updates: QueueResourceAbridgedUpdates
): QueueResourcesAbridgedIndex => {
  const updatedIndex = { ...index };

  if (updates.clip && typeof updates.clip.i === 'number') {
    updatedIndex.clips = {
      ...updatedIndex.clips,
      [updates.clip.i]: updates.clip,
    };
  }
  if (updates.item_soundbite && typeof updates.item_soundbite.i === 'number') {
    updatedIndex.item_soundbites = {
      ...updatedIndex.item_soundbites,
      [updates.item_soundbite.i]: updates.item_soundbite,
    };
  }
  if (updates.add_by_rss_resource_data && typeof updates.add_by_rss_resource_data.a === 'string') {
    updatedIndex.add_by_rss_resource_datas = {
      ...updatedIndex.add_by_rss_resource_datas,
      [updates.add_by_rss_resource_data.a]: updates.add_by_rss_resource_data,
    };
  }
  if (updates.item && typeof updates.item.i === 'number') {
    updatedIndex.items = {
      ...updatedIndex.items,
      [updates.item.i]: updates.item,
    };
  }

  return updatedIndex;
};

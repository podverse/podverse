import type { Item } from '@orm/entities/item/item.js';

export type DedupItemLike = {
  id: number;
  guid?: string | null;
  guid_enclosure_url?: string | null;
};

export function buildItemMapsForDedup<T extends DedupItemLike>(
  items: T[]
): {
  guidMap: Map<string, T>;
  guidEnclosureUrlMap: Map<string, T>;
} {
  const guidMap = new Map<string, T>();
  const guidEnclosureUrlMap = new Map<string, T>();
  for (const item of items) {
    if (item.guid) {
      guidMap.set(item.guid, item);
    }
    if (item.guid_enclosure_url) {
      guidEnclosureUrlMap.set(item.guid_enclosure_url, item);
    }
  }
  return { guidMap, guidEnclosureUrlMap };
}

export function findDuplicateItemForDedup<T extends DedupItemLike>(
  itemToArchive: T,
  guidMap: Map<string, T>,
  guidEnclosureUrlMap: Map<string, T>
): T | undefined {
  if (itemToArchive.guid && guidMap.has(itemToArchive.guid)) {
    return guidMap.get(itemToArchive.guid);
  }
  if (
    itemToArchive.guid_enclosure_url &&
    guidEnclosureUrlMap.has(itemToArchive.guid_enclosure_url)
  ) {
    return guidEnclosureUrlMap.get(itemToArchive.guid_enclosure_url);
  }
  return undefined;
}

export type DedupItemMaps = ReturnType<typeof buildItemMapsForDedup<Item>>;

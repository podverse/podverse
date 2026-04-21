import { formatGuidEnclosureUrl } from '@podverse/helpers';

export type StableKeySource = {
  guid?: string | null;
  enclosure?: {
    url?: string | null;
  } | null;
};

export const getParsedItemStableKey = (parsedItem: StableKeySource): string | null => {
  const guid = parsedItem.guid?.trim();
  if (guid) {
    return `guid:${guid}`;
  }

  const enclosureUrl = parsedItem.enclosure?.url?.trim();
  if (enclosureUrl) {
    return `enclosure:${formatGuidEnclosureUrl(enclosureUrl)}`;
  }

  return null;
};

export const createParsedItemStableKeySet = (parsedItems: StableKeySource[]): Set<string> => {
  const itemStableKeys = new Set<string>();

  for (const parsedItem of parsedItems) {
    const stableKey = getParsedItemStableKey(parsedItem);
    if (stableKey) {
      itemStableKeys.add(stableKey);
    }
  }

  return itemStableKeys;
};

export const dedupeByStableKey = <T>(
  items: T[],
  getStableKey: (item: T) => string | null,
  keysToSkip: Set<string> = new Set()
): T[] => {
  const seenKeys = new Set<string>();
  const dedupedItems: T[] = [];

  for (const item of items) {
    const stableKey = getStableKey(item);
    if (stableKey === null) {
      dedupedItems.push(item);
      continue;
    }

    if (keysToSkip.has(stableKey) || seenKeys.has(stableKey)) {
      continue;
    }

    seenKeys.add(stableKey);
    dedupedItems.push(item);
  }

  return dedupedItems;
};

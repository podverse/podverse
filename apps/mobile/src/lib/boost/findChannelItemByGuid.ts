export type ChannelItemGuidMatch = {
  guid?: string | null;
  id_text?: string | null;
};

export type ChannelItemGuidPage<T extends ChannelItemGuidMatch> = {
  items: readonly T[];
  meta: {
    count: number | null;
    limit: number;
  };
};

const isGuidMatch = <T extends ChannelItemGuidMatch>(item: T, guid: string): boolean => {
  const idText = item.id_text?.trim() ?? '';
  return item.guid === guid && idText !== '';
};

/**
 * Walk a channel's item pages until one row's guid matches, then stop.
 * A blank guid does not fetch. A guid whose id text is blank is not a match.
 */
export const findChannelItemByGuid = async <T extends ChannelItemGuidMatch>(
  guid: string,
  fetchPage: (page: number) => Promise<ChannelItemGuidPage<T>>
): Promise<T | null> => {
  if (guid.trim() === '') {
    return null;
  }

  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const response = await fetchPage(page);
    const found = response.items.find((item) => isGuidMatch(item, guid));
    if (found !== undefined) {
      return found;
    }
    const count = response.meta.count ?? 0;
    const limit = Math.max(1, response.meta.limit ?? 20);
    totalPages = Math.max(1, Math.ceil(count / limit));
    page += 1;
  }

  return null;
};

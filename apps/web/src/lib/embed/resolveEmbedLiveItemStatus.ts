import type { DTOItem } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers';

export function resolveEmbedLiveItemStatusId(item: DTOItem): LiveItemStatusEnum | null {
  const liveItem = item.live_item;

  if (liveItem === null || liveItem === undefined) {
    return null;
  }

  const statusId = liveItem.live_item_status?.id ?? liveItem.live_item_status_id;

  if (statusId === null || statusId === undefined) {
    return null;
  }

  return statusId;
}

export function isEmbedItemCurrentlyLive(item: DTOItem): boolean {
  return resolveEmbedLiveItemStatusId(item) === LiveItemStatusEnum.Live;
}

export function filterEmbedCurrentlyLiveChannelItems(items: DTOItem[]): DTOItem[] {
  return items.filter(isEmbedItemCurrentlyLive);
}

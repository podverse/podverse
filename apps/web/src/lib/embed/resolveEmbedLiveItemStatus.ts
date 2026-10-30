import type { DTOItem } from '@podverse/helpers';
import { LiveItemStatusEnum, resolveItemLiveStatusId } from '@podverse/helpers';

export function isEmbedItemCurrentlyLive(item: DTOItem): boolean {
  return resolveItemLiveStatusId(item) === LiveItemStatusEnum.Live;
}

export function filterEmbedCurrentlyLiveChannelItems(items: DTOItem[]): DTOItem[] {
  return items.filter(isEmbedItemCurrentlyLive);
}

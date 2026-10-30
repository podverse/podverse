import type { DTOItem } from '../dtos/item/item.js';
import { LiveItemStatusEnum } from '../dtos/liveItem/liveItem.js';

/**
 * The item's live status, or null when the item is not a live item. Reads the
 * `live_item_status` relation first, then the `live_item_status_id` column, because list and
 * detail responses do not always carry both.
 */
export function resolveItemLiveStatusId(
  item: Pick<DTOItem, 'live_item'>
): LiveItemStatusEnum | null {
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

export function getLiveItemStatusEnumValue(input: string | null): LiveItemStatusEnum | null {
  const sanitizedInput = input
    ?.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapping: { [key: string]: LiveItemStatusEnum } = {
    pending: LiveItemStatusEnum.Pending,
    live: LiveItemStatusEnum.Live,
    ended: LiveItemStatusEnum.Ended,
  };

  return (sanitizedInput && mapping[sanitizedInput]) || null;
}

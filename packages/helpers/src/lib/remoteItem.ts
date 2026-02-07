import { isValidReliableUUID } from './guid.js';

export type RemoteItemDto = {
  feed_guid: string;
  feed_url: string | null;
  item_guid: string | null;
  title: string | null;
  medium_id: number | null;
};

export function hasValidFeedUuid(remoteItem: RemoteItemDto): boolean {
  return typeof remoteItem?.feed_guid === 'string' && isValidReliableUUID(remoteItem.feed_guid);
}

export function filterInvalidFeedUuids(remoteItems: RemoteItemDto[]): RemoteItemDto[] {
  return remoteItems.filter(hasValidFeedUuid);
}

import type {
  DTORemoteChannelStub,
  DTORemoteItemStub,
  RemoteItemsResponse,
} from '@podverse/helpers';

export function nonEmptyTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** `${index_provider}:${provider_feed_id}` */
export function remoteChannelStubRowKey(stub: DTORemoteChannelStub): string {
  return `${stub.index_provider}:${stub.provider_feed_id}`;
}

/** `${index_provider}:${provider_feed_id}:${item_guid}` from `channel_stub`. */
export function remoteItemStubRowKey(stub: DTORemoteItemStub): string {
  return `${remoteChannelStubRowKey(stub.channel_stub)}:${stub.item_guid}`;
}

export function remoteItemsResponseHasRows(
  response: RemoteItemsResponse | null
): response is RemoteItemsResponse {
  if (response === null) {
    return false;
  }
  return (
    response.channelsAdded.length > 0 ||
    response.channelsUnadded.length > 0 ||
    response.itemsAdded.length > 0 ||
    response.itemsUnadded.length > 0
  );
}

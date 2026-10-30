import type { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import type { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';

import type { DTORemoteChannelStub, DTORemoteItemStub } from '@podverse/helpers';

export function toDTORemoteChannelStub(stub: RemoteChannelStub): DTORemoteChannelStub {
  return {
    is_remote_stub: true,
    index_provider: stub.index_provider,
    provider_feed_id: stub.provider_feed_id,
    feed_guid: stub.feed_guid,
    feed_url: stub.feed_url,
    title: stub.title,
    author: stub.author,
    image_url: stub.image_url,
    medium_id: stub.medium_id,
  };
}

export function toDTORemoteItemStub(
  stub: RemoteItemStub,
  channelStub: RemoteChannelStub
): DTORemoteItemStub {
  return {
    is_remote_stub: true,
    item_guid: stub.item_guid,
    provider_item_id: stub.provider_item_id,
    title: stub.title,
    image_url: stub.image_url,
    pub_date: stub.pub_date === null ? null : stub.pub_date.toISOString(),
    duration_seconds: stub.duration_seconds,
    channel_stub: toDTORemoteChannelStub(channelStub),
  };
}

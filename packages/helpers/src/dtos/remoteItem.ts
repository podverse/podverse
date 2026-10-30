import type { IndexProviderId } from '../lib/indexProvider.js';
import type { DTOChannel } from './channel/channel.js';
import type { DTOItem } from './item/item.js';

export interface RemoteItemsResponse {
  /** Parsed Podverse channels the references point to, in feed order. */
  channelsAdded: DTOChannel[];
  /**
   * Remote stubs for channel references no parsed channel matches, in feed order, one per stub.
   * A reference with neither a parsed channel nor a stub is left out.
   */
  channelsUnadded: DTORemoteChannelStub[];
  /** Parsed Podverse items the references point to, in feed order. */
  itemsAdded: DTOItem[];
  /**
   * Remote item stubs for item references whose channel is not parsed, in feed order, one per
   * stub. Each carries its channel stub. A reference without an item stub is left out, and so is
   * an item reference whose channel is parsed but whose item is not.
   */
  itemsUnadded: DTORemoteItemStub[];
}

export type RemoteItemGeneric = {
  feed_guid: string | null;
  feed_url: string | null;
  item_guid: string | null;
};

export interface PublisherRemoteItemsResponse extends RemoteItemsResponse {
  channel: DTOChannel;
  /** Albums verified to this publisher (both feeds reference each other), in the publisher feed's order. */
  channelsAdded: DTOChannel[];
  /** Remote stubs for albums the publisher feed lists that Podverse has not parsed. */
  channelsUnadded: DTORemoteChannelStub[];
  /** Tracks on the verified albums, plus tracks credited to this publisher alone, newest first. */
  itemsAdded: DTOItem[];
  /** Always empty. Item references in a publisher feed are not shown; nothing can verify them. */
  itemsUnadded: DTORemoteItemStub[];
}

/**
 * A remote item feed the index provider knows but Podverse has not fully parsed. A stable client
 * key is `${index_provider}:${provider_feed_id}`.
 */
export interface DTORemoteChannelStub {
  is_remote_stub: true;
  index_provider: IndexProviderId;
  provider_feed_id: string;
  feed_guid: string | null;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;
  medium_id: number | null;
}

/**
 * A remote item the index provider knows, with its channel stub. A stable client key is
 * `${index_provider}:${provider_feed_id}:${item_guid}`.
 */
export interface DTORemoteItemStub {
  is_remote_stub: true;
  item_guid: string;
  provider_item_id: string | null;
  title: string | null;
  image_url: string | null;
  /** ISO 8601. */
  pub_date: string | null;
  duration_seconds: number | null;
  channel_stub: DTORemoteChannelStub;
}

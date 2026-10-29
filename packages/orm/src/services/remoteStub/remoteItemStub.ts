import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import type { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';
import { In } from 'typeorm';

import type { IndexProviderItem } from '@podverse/helpers';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { RemoteStubRefKeys } from './remoteChannelStub.js';
import {
  readRemoteStubReturnedId,
  RemoteChannelStubService,
  toRemoteStubImageUrl,
  toRemoteStubText,
} from './remoteChannelStub.js';

export type RemoteItemStubRef = RemoteStubRefKeys & { itemGuid: string };

function toDurationSeconds(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function toProviderItemId(value: string | null): string | null {
  if (value === null || value.length > DATABASE_CONSTANTS.varchar_short) {
    return null;
  }
  return value;
}

function itemStubKey(channelStubId: number, itemGuid: string): string {
  return `${channelStubId}\n${itemGuid}`;
}

const UPSERT_ITEM_STUB_SQL = `INSERT INTO remote_item_stub (
  remote_channel_stub_id,
  item_guid,
  provider_item_id,
  title,
  image_url,
  pub_date,
  duration_seconds,
  resolved_at,
  updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
ON CONFLICT (remote_channel_stub_id, item_guid) DO UPDATE SET
  provider_item_id = EXCLUDED.provider_item_id,
  title = EXCLUDED.title,
  image_url = EXCLUDED.image_url,
  pub_date = EXCLUDED.pub_date,
  duration_seconds = EXCLUDED.duration_seconds,
  resolved_at = now(),
  updated_at = now()
RETURNING id`;

export class RemoteItemStubService {
  /** Takes the channel stub so an item stub is never written without one. */
  async upsertItemStub(
    channelStub: RemoteChannelStub,
    item: IndexProviderItem
  ): Promise<RemoteItemStub> {
    if (
      item.indexProvider !== channelStub.index_provider ||
      item.providerFeedId !== channelStub.provider_feed_id
    ) {
      throw new Error(
        `Remote item stub ${item.indexProvider}:${item.providerFeedId} does not belong to channel stub ` +
          `${channelStub.index_provider}:${channelStub.provider_feed_id}`
      );
    }
    if (item.itemGuid.length === 0 || item.itemGuid.length > DATABASE_CONSTANTS.varchar_uri) {
      throw new Error(
        `Remote item stub GUID is empty or too long for ${item.indexProvider}:${item.providerFeedId}`
      );
    }

    const dataSource = getDataSourceReadWrite();
    const inserted: unknown = await dataSource.query(UPSERT_ITEM_STUB_SQL, [
      channelStub.id,
      item.itemGuid,
      toProviderItemId(item.providerItemId),
      toRemoteStubText(item.title, DATABASE_CONSTANTS.varchar_normal),
      toRemoteStubImageUrl(item.imageUrl),
      item.pubDate,
      toDurationSeconds(item.durationSeconds),
    ]);
    const id = readRemoteStubReturnedId(inserted);

    const stub = await dataSource.getRepository(RemoteItemStub).findOne({ where: { id } });
    if (!stub) {
      throw new Error(`Remote item stub ${id} not found after upsert`);
    }
    stub.remote_channel_stub = channelStub;
    return stub;
  }

  /**
   * Resolves channel stubs through the alias lookup, then the item stubs under them. Aligned with
   * `refs`; each found stub has `remote_channel_stub` loaded.
   */
  async getItemStubsForRefs(
    refs: readonly RemoteItemStubRef[]
  ): Promise<(RemoteItemStub | null)[]> {
    if (refs.length === 0) {
      return [];
    }

    const channelStubs = await new RemoteChannelStubService().getChannelStubsForRefs(refs);
    const channelStubById = new Map<number, RemoteChannelStub>();
    const itemGuids = new Set<string>();
    refs.forEach((ref, index) => {
      const channelStub = channelStubs[index];
      const itemGuid = ref.itemGuid.trim();
      if (channelStub && itemGuid.length > 0) {
        channelStubById.set(channelStub.id, channelStub);
        itemGuids.add(itemGuid);
      }
    });

    if (channelStubById.size === 0) {
      return refs.map(() => null);
    }

    const itemStubs = await getDataSourceRead()
      .getRepository(RemoteItemStub)
      .find({
        where: {
          remote_channel_stub_id: In([...channelStubById.keys()]),
          item_guid: In([...itemGuids]),
        },
      });

    const itemStubByKey = new Map<string, RemoteItemStub>();
    for (const itemStub of itemStubs) {
      const channelStub = channelStubById.get(itemStub.remote_channel_stub_id);
      if (channelStub) {
        itemStub.remote_channel_stub = channelStub;
        itemStubByKey.set(
          itemStubKey(itemStub.remote_channel_stub_id, itemStub.item_guid),
          itemStub
        );
      }
    }

    return refs.map((ref, index) => {
      const channelStub = channelStubs[index];
      if (!channelStub) {
        return null;
      }
      return itemStubByKey.get(itemStubKey(channelStub.id, ref.itemGuid.trim())) ?? null;
    });
  }
}

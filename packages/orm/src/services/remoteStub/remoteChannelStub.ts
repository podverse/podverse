import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import type { RemoteStubAliasKeyKind } from '@orm/entities/remoteStub/remoteChannelStubAlias.js';
import { RemoteChannelStubAlias } from '@orm/entities/remoteStub/remoteChannelStubAlias.js';
import type { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';

import type { IndexProviderFeed, IndexProviderId } from '@podverse/helpers';
import { DATABASE_CONSTANTS, getMediumEnumValue, isValidReliableUUID } from '@podverse/helpers';

export type RemoteStubRefKeys = { feedGuid: string | null; feedUrl: string | null };

export type RemoteChannelStubWithRelations = RemoteChannelStub & {
  aliases: RemoteChannelStubAlias[];
  item_stubs: RemoteItemStub[];
};

/** Trim + lowercase; null unless `isValidReliableUUID`. */
export function normalizeRemoteStubFeedGuid(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return isValidReliableUUID(normalized) ? normalized : null;
}

/** Trim; null when empty or longer than DATABASE_CONSTANTS.varchar_uri. Case is kept. */
export function normalizeRemoteStubFeedUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > DATABASE_CONSTANTS.varchar_uri) {
    return null;
  }
  return trimmed;
}

/** Cuts provider text to the column length. */
export function toRemoteStubText(value: string | null, maxLength: number): string | null {
  if (value === null) {
    return null;
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

/** A provider image URL too long for its column is stored as null rather than cut. */
export function toRemoteStubImageUrl(value: string | null): string | null {
  if (value === null || value.length > DATABASE_CONSTANTS.varchar_uri) {
    return null;
  }
  return value;
}

function readRowId(row: unknown): number | null {
  if (typeof row === 'object' && row !== null) {
    const id: unknown = Reflect.get(row, 'id');
    if (typeof id === 'number' && Number.isSafeInteger(id)) {
      return id;
    }
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      return Number(id);
    }
  }
  return null;
}

/** Reads the `id` of the first row from an `INSERT … RETURNING id` raw result. */
export function readRemoteStubReturnedId(result: unknown): number {
  const id = readRowId(Array.isArray(result) ? result[0] : undefined);
  if (id === null) {
    throw new Error('Remote stub upsert returned no id');
  }
  return id;
}

/** Reads every `id` from a raw `SELECT … AS id` result. */
function readRemoteStubIds(result: unknown): number[] {
  if (!Array.isArray(result)) {
    return [];
  }
  return result.map(readRowId).filter((id): id is number => id !== null);
}

type RemoteStubAliasKey = { kind: RemoteStubAliasKeyKind; value: string };

/** Normalized, deduped, sorted so concurrent upserts lock alias rows in the same order. */
function collectAliasKeys(
  feed: IndexProviderFeed,
  refKeys: readonly RemoteStubRefKeys[]
): RemoteStubAliasKey[] {
  const byId = new Map<string, RemoteStubAliasKey>();
  const add = (kind: RemoteStubAliasKeyKind, value: string | null) => {
    if (value !== null) {
      byId.set(`${kind}\n${value}`, { kind, value });
    }
  };

  for (const ref of [...refKeys, { feedGuid: feed.feedGuid, feedUrl: feed.feedUrl }]) {
    add('feed_guid', normalizeRemoteStubFeedGuid(ref.feedGuid));
    add('feed_url', normalizeRemoteStubFeedUrl(ref.feedUrl));
  }

  const compare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
  return [...byId.values()].sort(
    (left, right) => compare(left.kind, right.kind) || compare(left.value, right.value)
  );
}

const UPSERT_CHANNEL_STUB_SQL = `INSERT INTO remote_channel_stub (
  index_provider,
  provider_feed_id,
  feed_guid,
  feed_url,
  title,
  author,
  image_url,
  medium_id,
  resolved_at,
  updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
ON CONFLICT (index_provider, provider_feed_id) DO UPDATE SET
  feed_guid = EXCLUDED.feed_guid,
  feed_url = EXCLUDED.feed_url,
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  image_url = EXCLUDED.image_url,
  medium_id = EXCLUDED.medium_id,
  resolved_at = now(),
  updated_at = now()
RETURNING id`;

const UPSERT_ALIASES_SQL = `INSERT INTO remote_channel_stub_alias (
  remote_channel_stub_id,
  key_kind,
  key_value
)
SELECT $1, incoming.key_kind, incoming.key_value
FROM unnest($2::text[], $3::varchar[]) AS incoming(key_kind, key_value)
ON CONFLICT (key_kind, key_value) DO UPDATE SET
  remote_channel_stub_id = EXCLUDED.remote_channel_stub_id`;

const SELECT_ALIAS_OWNERS_SQL = `SELECT DISTINCT alias.remote_channel_stub_id AS id
FROM remote_channel_stub_alias alias
JOIN unnest($2::text[], $3::varchar[]) AS incoming(key_kind, key_value)
  ON alias.key_kind = incoming.key_kind AND alias.key_value = incoming.key_value
WHERE alias.remote_channel_stub_id <> $1`;

const DELETE_STUBS_WITHOUT_ALIASES_SQL = `DELETE FROM remote_channel_stub stub
WHERE stub.id = ANY($1::int[])
  AND NOT EXISTS (
    SELECT 1 FROM remote_channel_stub_alias alias WHERE alias.remote_channel_stub_id = stub.id
  )`;

const LOCK_CHANNEL_STUB_SQL = `SELECT id FROM remote_channel_stub WHERE id = $1 FOR UPDATE`;

const MOVE_ALIASES_SQL = `UPDATE remote_channel_stub_alias
SET remote_channel_stub_id = $1
WHERE remote_channel_stub_id = $2`;

/**
 * Episode ids change across a provider merge, so copies drop `provider_item_id`, and the epoch
 * `resolved_at` makes the next resolver run refresh them.
 */
const COPY_ITEM_STUBS_AS_STALE_SQL = `INSERT INTO remote_item_stub (
  remote_channel_stub_id,
  item_guid,
  provider_item_id,
  title,
  image_url,
  pub_date,
  duration_seconds,
  resolved_at
)
SELECT $1, item_guid, NULL, title, image_url, pub_date, duration_seconds, 'epoch'::timestamptz
FROM remote_item_stub
WHERE remote_channel_stub_id = $2
ON CONFLICT (remote_channel_stub_id, item_guid) DO NOTHING`;

const DELETE_CHANNEL_STUB_SQL = `DELETE FROM remote_channel_stub WHERE id = $1`;

/** Inserts or refreshes the stub row for `feed` and returns its id. */
async function upsertChannelStubRow(
  manager: EntityManager,
  feed: IndexProviderFeed
): Promise<number> {
  const feedUrl = normalizeRemoteStubFeedUrl(feed.feedUrl);
  if (feedUrl === null) {
    throw new Error(
      `Remote channel stub feed URL is empty or too long for ${feed.indexProvider}:${feed.providerFeedId}`
    );
  }
  if (feed.providerFeedId.length > DATABASE_CONSTANTS.varchar_short) {
    throw new Error(`Remote channel stub provider feed id is too long: ${feed.providerFeedId}`);
  }

  const inserted: unknown = await manager.query(UPSERT_CHANNEL_STUB_SQL, [
    feed.indexProvider,
    feed.providerFeedId,
    normalizeRemoteStubFeedGuid(feed.feedGuid),
    feedUrl,
    toRemoteStubText(feed.title, DATABASE_CONSTANTS.varchar_normal),
    toRemoteStubText(feed.author, DATABASE_CONSTANTS.varchar_normal),
    toRemoteStubImageUrl(feed.imageUrl),
    feed.medium === null ? null : getMediumEnumValue(feed.medium),
  ]);
  return readRemoteStubReturnedId(inserted);
}

/**
 * Points every key at `stubId`. A stub that loses its last alias to this write is unreachable,
 * so it is deleted here; its item stubs cascade. A stub that keeps another alias stays.
 */
async function writeAliasesAndDropOrphans(
  manager: EntityManager,
  stubId: number,
  aliasKeys: readonly RemoteStubAliasKey[]
): Promise<void> {
  if (aliasKeys.length === 0) {
    return;
  }
  const kinds = aliasKeys.map((key) => key.kind);
  const values = aliasKeys.map((key) => key.value);

  const previousOwnerIds = readRemoteStubIds(
    await manager.query(SELECT_ALIAS_OWNERS_SQL, [stubId, kinds, values])
  );
  await manager.query(UPSERT_ALIASES_SQL, [stubId, kinds, values]);
  if (previousOwnerIds.length > 0) {
    await manager.query(DELETE_STUBS_WITHOUT_ALIASES_SQL, [previousOwnerIds]);
  }
}

async function findChannelStubOrThrow(
  manager: EntityManager,
  id: number
): Promise<RemoteChannelStub> {
  const stub = await manager.findOne(RemoteChannelStub, { where: { id } });
  if (!stub) {
    throw new Error(`Remote channel stub ${id} not found after upsert`);
  }
  return stub;
}

export class RemoteChannelStubService {
  /**
   * Upserts the stub by provider feed id, then points every reference key and the provider's own
   * GUID and URL at it. The latest resolution of a key wins, which is how a key moves to a new
   * stub after a provider merge; the stub it moved from is deleted once no alias points to it.
   * Safe under concurrent parses that reference the same feed.
   */
  async upsertChannelStub(
    feed: IndexProviderFeed,
    refKeys: readonly RemoteStubRefKeys[]
  ): Promise<RemoteChannelStub> {
    const aliasKeys = collectAliasKeys(feed, refKeys);

    return getDataSourceReadWrite().transaction(async (manager) => {
      const id = await upsertChannelStubRow(manager, feed);
      await writeAliasesAndDropOrphans(manager, id, aliasKeys);
      return findChannelStubOrThrow(manager, id);
    });
  }

  /**
   * Moves a stub to the provider feed it now resolves to: its aliases, and its item stubs as stale
   * rows. Returns the target stub, or null when `fromStubId` no longer exists.
   */
  async repointToFeed(
    fromStubId: number,
    feed: IndexProviderFeed
  ): Promise<RemoteChannelStub | null> {
    return getDataSourceReadWrite().transaction(async (manager) => {
      const locked = readRemoteStubIds(await manager.query(LOCK_CHANNEL_STUB_SQL, [fromStubId]));
      if (locked.length === 0) {
        return null;
      }

      const toStubId = await upsertChannelStubRow(manager, feed);
      if (toStubId !== fromStubId) {
        await manager.query(MOVE_ALIASES_SQL, [toStubId, fromStubId]);
        await writeAliasesAndDropOrphans(manager, toStubId, collectAliasKeys(feed, []));
        await manager.query(COPY_ITEM_STUBS_AS_STALE_SQL, [toStubId, fromStubId]);
        await manager.query(DELETE_CHANNEL_STUB_SQL, [fromStubId]);
      }
      return findChannelStubOrThrow(manager, toStubId);
    });
  }

  /** Aligned with `refs`: the stub matched by GUID, else by URL, else null. */
  async getChannelStubsForRefs(
    refs: readonly RemoteStubRefKeys[]
  ): Promise<(RemoteChannelStub | null)[]> {
    const normalized = refs.map((ref) => ({
      guid: normalizeRemoteStubFeedGuid(ref.feedGuid),
      url: normalizeRemoteStubFeedUrl(ref.feedUrl),
    }));
    const guids = [
      ...new Set(normalized.map((ref) => ref.guid).filter((v): v is string => v !== null)),
    ];
    const urls = [
      ...new Set(normalized.map((ref) => ref.url).filter((v): v is string => v !== null)),
    ];

    const where: FindOptionsWhere<RemoteChannelStubAlias>[] = [];
    if (guids.length > 0) {
      where.push({ key_kind: 'feed_guid', key_value: In(guids) });
    }
    if (urls.length > 0) {
      where.push({ key_kind: 'feed_url', key_value: In(urls) });
    }
    if (where.length === 0) {
      return refs.map(() => null);
    }

    const aliases = await getDataSourceRead()
      .getRepository(RemoteChannelStubAlias)
      .find({ where, relations: { remote_channel_stub: true } });

    const stubByGuid = new Map<string, RemoteChannelStub>();
    const stubByUrl = new Map<string, RemoteChannelStub>();
    for (const alias of aliases) {
      const target = alias.key_kind === 'feed_guid' ? stubByGuid : stubByUrl;
      target.set(alias.key_value, alias.remote_channel_stub);
    }

    return normalized.map(
      (ref) =>
        (ref.guid !== null ? stubByGuid.get(ref.guid) : undefined) ??
        (ref.url !== null ? stubByUrl.get(ref.url) : undefined) ??
        null
    );
  }

  async getByProviderFeedId(
    indexProvider: IndexProviderId,
    providerFeedId: string
  ): Promise<RemoteChannelStub | null> {
    return getDataSourceRead()
      .getRepository(RemoteChannelStub)
      .findOne({ where: { index_provider: indexProvider, provider_feed_id: providerFeedId } });
  }

  async getByIdWithRelations(id: number): Promise<RemoteChannelStubWithRelations | null> {
    return getDataSourceRead()
      .getRepository(RemoteChannelStub)
      .findOne({ where: { id }, relations: { aliases: true, item_stubs: true } });
  }

  async listProviderFeedIds(indexProvider: IndexProviderId): Promise<string[]> {
    const rows = await getDataSourceRead()
      .getRepository(RemoteChannelStub)
      .find({ select: { provider_feed_id: true }, where: { index_provider: indexProvider } });
    return rows.map((row) => row.provider_feed_id);
  }

  /**
   * After a full parse saves a channel, deletes the stubs it replaces: matched by Podcast Index
   * feed id, by GUID, or by feed URL. Aliases and item stubs cascade.
   */
  async deleteForParsedFeed(params: {
    podcastIndexId: number | null;
    podcastGuid: string | null;
    feedUrl: string | null;
  }): Promise<number> {
    const conditions: string[] = [];
    const parameters: Record<string, string> = {};

    if (params.podcastIndexId !== null) {
      const podcastIndexProvider: IndexProviderId = 'podcast_index';
      conditions.push(
        '(index_provider = :podcastIndexProvider AND provider_feed_id = :providerFeedId)'
      );
      parameters.podcastIndexProvider = podcastIndexProvider;
      parameters.providerFeedId = String(params.podcastIndexId);
    }

    const feedGuid = normalizeRemoteStubFeedGuid(params.podcastGuid);
    if (feedGuid !== null) {
      conditions.push('feed_guid = :feedGuid');
      parameters.feedGuid = feedGuid;
    }

    const feedUrl = normalizeRemoteStubFeedUrl(params.feedUrl);
    if (feedUrl !== null) {
      conditions.push('feed_url = :feedUrl');
      parameters.feedUrl = feedUrl;
    }

    if (conditions.length === 0) {
      return 0;
    }

    const result = await getDataSourceReadWrite()
      .getRepository(RemoteChannelStub)
      .createQueryBuilder()
      .delete()
      .where(conditions.join(' OR '), parameters)
      .execute();
    return result.affected ?? 0;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await getDataSourceReadWrite().getRepository(RemoteChannelStub).delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
